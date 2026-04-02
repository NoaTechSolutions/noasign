import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Header,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DocumentsService } from './documents.service';
import { BoldSignService } from '../boldsign/boldsign.service';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Controller('boldsign')
export class BoldSignController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly boldSignService: BoldSignService,
  ) {}

  @Post('webhooks/events')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Body() body?: Record<string, unknown>,
    @Headers('x-boldsign-signature') signatureHeader?: string,
    @Headers('x-boldsign-event') signatureEventHeader?: string,
  ) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('BoldSign callback payload is missing');
    }

    const event = this.asRecord(body.event);
    const eventType =
      typeof event?.eventType === 'string' ? event.eventType.trim() : '';

    const hasValidSignature = this.boldSignService.verifyEventCallback(
      req.rawBody,
      signatureHeader,
    );

    this.logWebhookDebug({
      eventType,
      signatureEventHeader,
      hasSignatureHeader: Boolean(signatureHeader?.trim()),
      hasValidSignature,
      providerDocumentId:
        typeof body?.data === 'object' &&
        body.data !== null &&
        !Array.isArray(body.data) &&
        typeof (body.data as Record<string, unknown>).documentId === 'string'
          ? ((body.data as Record<string, unknown>).documentId as string)
          : '',
      noasignDocumentId:
        typeof body?.data === 'object' &&
        body.data !== null &&
        !Array.isArray(body.data) &&
        typeof (body.data as Record<string, unknown>).metaData === 'object' &&
        (body.data as Record<string, unknown>).metaData !== null &&
        !Array.isArray((body.data as Record<string, unknown>).metaData) &&
        typeof (
          (body.data as Record<string, unknown>).metaData as Record<
            string,
            unknown
          >
        ).noasignDocumentId === 'string'
          ? ((
              (body.data as Record<string, unknown>).metaData as Record<
                string,
                unknown
              >
            ).noasignDocumentId as string)
          : '',
    });

    if (eventType === 'Verification' && !signatureHeader) {
      return { ok: true };
    }

    if (!hasValidSignature) {
      throw new ForbiddenException('Invalid BoldSign callback signature');
    }

    if (eventType && eventType !== 'Verification') {
      await this.documentsService.handleBoldSignWebhook(body);
    }

    return { ok: true };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private logWebhookDebug(payload: {
    eventType: string;
    signatureEventHeader?: string;
    hasSignatureHeader: boolean;
    hasValidSignature: boolean;
    providerDocumentId: string;
    noasignDocumentId: string;
  }) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const logDir = join(process.cwd(), 'runtime-logs');
    const logFile = join(logDir, 'boldsign-webhook.log');
    mkdirSync(logDir, { recursive: true });
    appendFileSync(
      logFile,
      `${JSON.stringify({
        receivedAt: new Date().toISOString(),
        ...payload,
      })}\n`,
      'utf8',
    );
  }
}
