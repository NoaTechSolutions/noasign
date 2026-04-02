import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service';

@Controller('public/signatures')
export class PublicSignaturesController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':token')
  async getSignatureCompletion(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    const protocol =
      req.protocol ||
      ((req.headers['x-forwarded-proto'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
        'http');
    const host = req.get('host') ?? '127.0.0.1:3000';
    const apiBaseUrl = `${protocol}://${host}`;

    return this.documentsService.getPublicSignatureCompletion(
      token,
      apiBaseUrl,
    );
  }

  @Get(':token/preview')
  async previewSignedPdf(@Param('token') token: string, @Res() res: Response) {
    await this.documentsService.streamPublicFinalPdf(token, 'inline', res);
  }

  @Get(':token/download')
  async downloadSignedPdf(@Param('token') token: string, @Res() res: Response) {
    await this.documentsService.streamPublicFinalPdf(token, 'attachment', res);
  }
}
