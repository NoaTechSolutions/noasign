import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

@Controller('documents/receipt')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  async createReceipt(
    @Req() req: { user: { id: string } },
    @Body() body: CreateReceiptDto,
  ) {
    const { document, receiptNumber } =
      await this.receiptsService.createReceipt(req.user.id, body);
    const failed = document.status === DocumentStatus.SEND_FAILED;
    return {
      message: failed
        ? 'Receipt created, but the email could not be sent'
        : 'Receipt created',
      receiptNumber,
      document,
      sendError: document.sendError ?? null,
    };
  }

  // Regenerated-on-the-fly PDF, streamed inline so an <iframe> can render it
  // (the cookie auth rides along automatically on same-origin requests).
  @Get(':id/pdf')
  async getReceiptPdf(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    await this.receiptsService.streamReceiptPdf(req.user.id, id, res);
  }

  @Post(':id/resend')
  async resendReceipt(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const { document } = await this.receiptsService.resendReceipt(
      req.user.id,
      id,
    );
    const failed = document.status === DocumentStatus.SEND_FAILED;
    return {
      message: failed ? 'Receipt resend failed' : 'Receipt resent',
      document,
      sendError: document.sendError ?? null,
    };
  }

  @Patch(':id')
  async updateReceipt(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateReceiptDto,
  ) {
    const { document } = await this.receiptsService.updateReceipt(
      req.user.id,
      id,
      body,
    );
    return { message: 'Receipt updated', document };
  }
}
