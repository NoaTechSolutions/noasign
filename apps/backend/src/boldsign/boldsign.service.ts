import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  CreateSignatureDocumentRequest,
  RemindSignatureDocumentRequest,
  SignatureBinaryResponse,
  SignatureFieldValue,
  SignatureRecipient,
  SignatureScalar,
  SignatureDocumentResponse,
  SendSignatureDocumentRequest,
} from '../signature-provider/signature-provider.types';

type BoldSignTemplateResponse = {
  id?: string;
  templateId?: string;
  title?: string;
  roles?: Array<{
    index?: number;
    roleIndex?: number;
    signerRole?: string;
    name?: string;
    formFields?: Array<{
      id?: string;
      formFieldId?: string;
    }>;
  }>;
  commonFields?: Array<{
    id?: string;
    formFieldId?: string;
  }>;
};

type BoldSignDocumentDetailsResponse = {
  documentId?: string;
  status?: string;
  displayStatus?: string;
  signerDetails?: Array<{
    status?: string | null;
    isViewed?: boolean | null;
    isDeliveryFailed?: boolean | null;
    isAuthenticationFailed?: boolean | null;
  }>;
};

type BoldSignSendTemplateResponse = {
  documentId?: string;
};

type TemplateRoleDetails = {
  index: number;
  name: string;
  fieldIds: Set<string>;
};

@Injectable()
export class BoldSignService {
  constructor(private readonly configService: ConfigService) {}

  async createDocumentFromTemplate(
    payload: CreateSignatureDocumentRequest,
  ): Promise<SignatureDocumentResponse> {
    const templateDetails = await this.getTemplateDetails(payload.templateId);
    const recipients = this.resolveRecipients(payload, templateDetails.roles);
    const fieldValues = this.buildFieldValues(payload.fields, payload.tokens);
    const requestBody = {
      Title: payload.name,
      Message:
        payload.message ??
        `Please review and sign ${payload.name} from NoaSign.`,
      MetaData: payload.metadata ?? {},
      EnableReassign: false,
      EnablePrintAndSign: false,
      ...(this.getBrandId() ? { BrandId: this.getBrandId() } : {}),
      Roles: recipients.map((recipient) => ({
        RoleIndex: recipient.templateRole.index,
        SignerRole: recipient.templateRole.name,
        SignerType: 'Signer',
        SignerName: this.buildRecipientName(recipient),
        SignerEmail: recipient.email,
        Locale: 'EN',
        ...(payload.signerRedirectUrl
          ? { RedirectUrl: payload.signerRedirectUrl }
          : {}),
        ExistingFormFields: this.buildExistingFormFields(
          recipient.templateRole.fieldIds,
          recipient.role,
          fieldValues,
        ),
      })),
    };

    const response = await this.request<BoldSignSendTemplateResponse>(
      `/v1/template/send?templateId=${encodeURIComponent(payload.templateId)}`,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.documentId) {
      throw new BadGatewayException(
        'BoldSign request succeeded but did not return a documentId',
      );
    }

    return {
      id: response.documentId,
      status: 'document.sent',
    };
  }

  async getDocumentStatus(
    documentId: string,
  ): Promise<{ id: string; status: string }> {
    const response = await this.request<BoldSignDocumentDetailsResponse>(
      `/v1/document/properties?documentId=${encodeURIComponent(documentId)}`,
    );

    return {
      id: response.documentId ?? documentId,
      status: this.mapDocumentStatus(response),
    };
  }

  async sendDocument(
    _documentId: string,
    _payload: SendSignatureDocumentRequest,
  ): Promise<void> {
    // BoldSign's template send endpoint delivers the document immediately.
  }

  async resendDocument(
    documentId: string,
    payload?: RemindSignatureDocumentRequest,
  ): Promise<void> {
    try {
      await this.requestVoid(
        `/v1/document/remind?documentId=${encodeURIComponent(documentId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json;odata.metadata=minimal;odata.streaming=true',
          },
          body: JSON.stringify({
            message:
              payload?.message?.trim() || 'Friendly reminder from NTSsign.',
          }),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';

      if (
        message.includes('boldsign request failed (403)') ||
        message.includes('forbidden')
      ) {
        throw new BadRequestException(
          'BoldSign only allows one manual reminder per document each day. Try again tomorrow.',
        );
      }

      throw error;
    }
  }

  async downloadDocumentPdf(
    documentId: string,
  ): Promise<SignatureBinaryResponse> {
    return this.requestBinary(
      `/v1/document/download?documentId=${encodeURIComponent(documentId)}`,
    );
  }

  async waitForDocumentDraft(
    documentId: string,
  ): Promise<{ id: string; status: string }> {
    return this.getDocumentStatus(documentId);
  }

  verifyEventCallback(
    rawBody: Buffer | string | undefined,
    signatureHeader: string | undefined,
  ) {
    const webhookSecret = this.getWebhookSecret();

    if (!webhookSecret || !rawBody || !signatureHeader?.trim()) {
      return false;
    }

    const parsedSignature = this.parseSignatureHeader(signatureHeader);
    if (!parsedSignature.timestamp || !parsedSignature.signatures.length) {
      return false;
    }

    const payload = `${parsedSignature.timestamp}.${this.toBodyString(rawBody)}`;
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return parsedSignature.signatures.some((signature) =>
      this.safeCompare(expectedSignature, signature),
    );
  }

  private async getTemplateDetails(templateId: string) {
    const response = await this.request<BoldSignTemplateResponse>(
      `/v1/template/properties?templateId=${encodeURIComponent(templateId)}`,
    );

    const roles = new Map<string, TemplateRoleDetails>();

    for (const role of response.roles ?? []) {
      const name = (role.signerRole ?? role.name ?? '').trim();
      const index = role.roleIndex ?? role.index;
      if (!name || typeof index !== 'number') {
        continue;
      }

      const fieldIds = new Set<string>();
      for (const field of role.formFields ?? []) {
        const fieldId = (field.id ?? field.formFieldId ?? '').trim();
        if (fieldId) {
          fieldIds.add(fieldId);
        }
      }

      roles.set(this.normalizeRole(name), { index, name, fieldIds });
    }

    return { roles };
  }

  private resolveRecipients(
    payload: CreateSignatureDocumentRequest,
    templateRoles: Map<string, TemplateRoleDetails>,
  ) {
    if (!templateRoles.size) {
      return payload.recipients.map((recipient, index) => ({
        ...recipient,
        templateRole: {
          index: index + 1,
          name: recipient.role,
          fieldIds: new Set<string>(),
        },
      }));
    }

    let recipients = [...payload.recipients];
    const missingRoles = this.getMissingTemplateRoles(
      templateRoles,
      recipients,
    );

    if (missingRoles.length === 1 && payload.senderRecipient?.email) {
      const templateRole = missingRoles[0];
      recipients = [
        ...recipients,
        {
          email: payload.senderRecipient.email,
          name: payload.senderRecipient.name,
          firstName: payload.senderRecipient.firstName,
          lastName: payload.senderRecipient.lastName,
          role: payload.senderRecipient.role?.trim() || templateRole.name,
        },
      ];
    }

    return recipients.map((recipient) => {
      const templateRole = templateRoles.get(
        this.normalizeRole(recipient.role),
      );

      if (!templateRole) {
        throw new BadRequestException(
          `BoldSign template does not include signer role "${recipient.role}"`,
        );
      }

      return {
        ...recipient,
        templateRole,
      };
    });
  }

  private getMissingTemplateRoles(
    templateRoles: Map<string, TemplateRoleDetails>,
    recipients: SignatureRecipient[],
  ) {
    const provided = new Set(
      recipients
        .map((recipient) => this.normalizeRole(recipient.role))
        .filter(Boolean),
    );

    return [...templateRoles.entries()]
      .filter(([roleKey]) => !provided.has(roleKey))
      .map(([, templateRole]) => templateRole);
  }

  private buildFieldValues(
    fields?: Record<string, SignatureFieldValue>,
    tokens?: Array<{ name: string; value: SignatureScalar }>,
  ) {
    const fieldValues = new Map<
      string,
      { value: SignatureScalar; role?: string }
    >();

    for (const token of tokens ?? []) {
      fieldValues.set(token.name, { value: token.value });
    }

    for (const [fieldName, config] of Object.entries(fields ?? {})) {
      fieldValues.set(fieldName, {
        value: config.value,
        role: config.role,
      });
    }

    return fieldValues;
  }

  private buildExistingFormFields(
    templateFieldIds: Set<string>,
    roleName: string,
    fieldValues: Map<string, { value: SignatureScalar; role?: string }>,
  ) {
    return [...fieldValues.entries()]
      .filter(([fieldId, config]) => {
        if (!templateFieldIds.has(fieldId)) {
          return false;
        }

        if (!config.role) {
          return true;
        }

        return this.normalizeRole(config.role) === this.normalizeRole(roleName);
      })
      .map(([fieldId, config]) => ({
        Id: fieldId,
        Value: String(config.value),
      }));
  }

  private buildRecipientName(
    recipient: Pick<
      SignatureRecipient,
      'email' | 'name' | 'firstName' | 'lastName'
    >,
  ) {
    const fullName =
      recipient.name?.trim() ||
      [recipient.firstName, recipient.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

    return fullName || recipient.email;
  }

  private mapDocumentStatus(document: BoldSignDocumentDetailsResponse) {
    const normalizedStatus = (document.status ?? '').trim().toLowerCase();
    const normalizedDisplayStatus = (document.displayStatus ?? '')
      .trim()
      .toLowerCase();

    if (
      ['needattention', 'needsattention', 'deliveryfailed'].includes(
        normalizedStatus,
      ) ||
      ['needattention', 'needsattention', 'deliveryfailed'].includes(
        normalizedDisplayStatus,
      ) ||
      (document.signerDetails ?? []).some(
        (detail) =>
          Boolean(detail.isDeliveryFailed) ||
          Boolean(detail.isAuthenticationFailed),
      )
    ) {
      return 'document.error';
    }

    if (['completed'].includes(normalizedStatus)) {
      return 'document.completed';
    }

    if (['declined', 'revoked', 'expired'].includes(normalizedStatus)) {
      return 'document.cancelled';
    }

    if (['draft'].includes(normalizedStatus)) {
      return 'document.draft';
    }

    if (['needattention', 'deliveryfailed'].includes(normalizedStatus)) {
      return 'document.error';
    }

    const signerStatuses = (document.signerDetails ?? [])
      .map((detail) => (detail.status ?? '').trim().toLowerCase())
      .filter(Boolean);

    if (
      signerStatuses.some((status) => ['completed', 'signed'].includes(status))
    ) {
      return 'document.signed';
    }

    if (
      (document.signerDetails ?? []).some((detail) => Boolean(detail.isViewed))
    ) {
      return 'document.viewed';
    }

    return 'document.sent';
  }

  private parseSignatureHeader(header: string) {
    const pairs = header
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key?.trim(), rest.join('=').trim()] as const;
      });

    const timestamp = pairs.find(([key]) => key === 't')?.[1] ?? null;
    const signatures = pairs
      .filter(([key]) => key === 's0' || key === 's1')
      .map(([, value]) => value)
      .filter(Boolean);

    return { timestamp, signatures };
  }

  private safeCompare(expected: string, received: string) {
    try {
      return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(received, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  private normalizeRole(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
  }

  private getBaseUrl() {
    return (
      this.configService.get<string>('BOLDSIGN_BASE_URL')?.trim() ??
      'https://api.boldsign.com'
    );
  }

  private getApiKey() {
    const apiKey = this.configService.get<string>('BOLDSIGN_API_KEY')?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        'BOLDSIGN_API_KEY is not configured',
      );
    }

    return apiKey;
  }

  private getWebhookSecret() {
    return (
      this.configService.get<string>('BOLDSIGN_WEBHOOK_SECRET')?.trim() ?? ''
    );
  }

  private getBrandId() {
    return this.configService.get<string>('BOLDSIGN_BRAND_ID')?.trim() ?? '';
  }

  private toBodyString(rawBody: Buffer | string) {
    return Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
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
          accept: 'application/json',
          'X-API-KEY': this.getApiKey(),
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(
          `BoldSign request failed (${response.status}): ${errorText || response.statusText}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error
          ? `BoldSign request failed: ${error.message}`
          : 'BoldSign request failed',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestBinary(
    path: string,
    init?: RequestInit,
  ): Promise<SignatureBinaryResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: '*/*',
          'X-API-KEY': this.getApiKey(),
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(
          `BoldSign request failed (${response.status}): ${errorText || response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();

      return {
        buffer: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type'),
        contentDisposition: response.headers.get('content-disposition'),
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error
          ? `BoldSign request failed: ${error.message}`
          : 'BoldSign request failed',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestVoid(path: string, init?: RequestInit): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.getBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: '*/*',
          'X-API-KEY': this.getApiKey(),
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(
          `BoldSign request failed (${response.status}): ${errorText || response.statusText}`,
        );
      }
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error
          ? `BoldSign request failed: ${error.message}`
          : 'BoldSign request failed',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
