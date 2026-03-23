import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { DocumentsService } from '../documents/documents.service';
import { PandaDocService } from './pandadoc.service';

@Controller('pandadoc')
export class PandaDocController {
  constructor(
    private readonly pandaDocService: PandaDocService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post('webhooks/events')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-pandadoc-signature') headerSignature?: string,
    @Headers('pandadoc-signature') legacyHeaderSignature?: string,
    @Body() body?: unknown,
  ) {
    const signature = headerSignature ?? legacyHeaderSignature;
    const isValid = this.pandaDocService.verifyWebhookSignature(
      req.rawBody,
      signature,
    );

    if (!isValid) {
      throw new ForbiddenException('Invalid PandaDoc webhook signature');
    }

    await this.documentsService.handlePandaDocWebhook(body);

    return { ok: true };
  }
}
