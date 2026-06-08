import {
  Controller,
  ForbiddenException,
  Header,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';
import { EmailService } from '../email/email.service';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

/**
 * Public endpoint for Resend webhooks (FASE 2: async bounce detection).
 *
 * No JWT guard — authenticity is enforced by the Svix signature verified in
 * EmailService.verifyResendWebhook(). Mirrors the BoldSign webhook controller
 * pattern (rawBody → verify → delegate → 200), but the crypto is Svix, not
 * BoldSign's custom HMAC. rawBody is available because main.ts enables it
 * globally (rawBody: true).
 */
@Controller('webhooks/resend')
export class ResendWebhookController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  @Header('Content-Type', 'application/json; charset=utf-8')
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
  ) {
    const event = this.emailService.verifyResendWebhook(req.rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    if (!event) {
      throw new ForbiddenException('Invalid Resend webhook signature');
    }

    await this.documentsService.handleResendWebhook(event);
    return { ok: true };
  }
}
