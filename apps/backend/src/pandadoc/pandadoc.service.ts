import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type PandaDocScalar = string | number | boolean;

type PandaDocToken = {
  name: string;
  value: PandaDocScalar;
};

type PandaDocFieldValue = {
  value: PandaDocScalar;
  role?: string;
};

type PandaDocRecipient = {
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
};

type PandaDocCreateDocumentRequest = {
  name: string;
  templateUuid: string;
  recipients: PandaDocRecipient[];
  tokens?: PandaDocToken[];
  fields?: Record<string, PandaDocFieldValue>;
  metadata?: Record<string, string>;
};

type PandaDocCreateDocumentResponse = {
  id: string;
  status: string;
};

type PandaDocStatusResponse = {
  id: string;
  status: string;
};

type PandaDocSendDocumentRequest = {
  subject: string;
  message: string;
};

@Injectable()
export class PandaDocService {
  constructor(private readonly configService: ConfigService) {}

  async createDocumentFromTemplate(
    payload: PandaDocCreateDocumentRequest,
  ): Promise<PandaDocCreateDocumentResponse> {
    return this.request<PandaDocCreateDocumentResponse>('/documents', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        template_uuid: payload.templateUuid,
        recipients: payload.recipients,
        tokens: payload.tokens,
        fields: payload.fields,
        metadata: payload.metadata,
        parse_form_fields: false,
      }),
    });
  }

  async getDocumentStatus(documentId: string): Promise<PandaDocStatusResponse> {
    return this.request<PandaDocStatusResponse>(`/documents/${documentId}`);
  }

  async sendDocument(
    documentId: string,
    payload: PandaDocSendDocumentRequest,
  ): Promise<void> {
    await this.request(`/documents/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify({
        subject: payload.subject,
        message: payload.message,
      }),
    });
  }

  async waitForDocumentDraft(
    documentId: string,
    timeoutMs = 45000,
  ): Promise<PandaDocStatusResponse> {
    const startedAt = Date.now();
    let delayMs = 1000;

    while (Date.now() - startedAt < timeoutMs) {
      const status = await this.getDocumentStatus(documentId);

      if (status.status === 'document.draft') {
        return status;
      }

      if (status.status === 'document.error') {
        throw new BadGatewayException(
          `PandaDoc document ${documentId} entered error status`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 5000);
    }

    throw new BadGatewayException(
      `Timed out waiting for PandaDoc document ${documentId} to reach draft status`,
    );
  }

  verifyWebhookSignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): boolean {
    const sharedKey = this.configService.get<string>(
      'PANDADOC_WEBHOOK_SHARED_KEY',
    );

    if (!sharedKey) {
      throw new InternalServerErrorException(
        'PANDADOC_WEBHOOK_SHARED_KEY is not configured',
      );
    }

    if (!rawBody || !signature) {
      return false;
    }

    const expected = createHmac('sha256', sharedKey)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  private getBaseUrl() {
    return (
      this.configService.get<string>('PANDADOC_BASE_URL') ??
      'https://api.pandadoc.com/public/v1'
    );
  }

  private getApiKey() {
    const apiKey = this.configService.get<string>('PANDADOC_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'PANDADOC_API_KEY is not configured',
      );
    }

    return apiKey;
  }

  private async request<T = unknown>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `API-Key ${this.getApiKey()}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(
          `PandaDoc request failed (${response.status}): ${errorText || response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error
          ? `PandaDoc request failed: ${error.message}`
          : 'PandaDoc request failed',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
