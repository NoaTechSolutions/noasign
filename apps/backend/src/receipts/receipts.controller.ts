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

  // Receipt dashboard stats for the current tenant: $ issued this month +
  // counts by real receipt status (draft/sent/sendFailed/cancelled/void).
  // Declared before ':id/pdf' so the literal 'stats' segment matches first.
  @Get('stats')
  async getReceiptStats(@Req() req: { user: { id: string } }) {
    return this.receiptsService.getReceiptStats(req.user.id);
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

  // Reissue a SENT receipt: creates a NEW receipt with corrected data + next
  // number, sends it, and voids the original (2c). Body = corrected receipt data.
  @Post(':id/reissue')
  async reissueReceipt(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateReceiptDto,
  ) {
    const { document, receiptNumber } =
      await this.receiptsService.reissueReceipt(req.user.id, id, body);
    const failed = document.status === DocumentStatus.SEND_FAILED;
    return {
      message: failed
        ? 'Receipt reissued, but the email could not be sent'
        : 'Receipt reissued',
      receiptNumber,
      document,
      sendError: document.sendError ?? null,
    };
  }

  // Void a SENT receipt directly (no replacement) — marks it VOID + stamps the
  // stored PDF. Distinct from reissue (which also creates a corrected copy).
  @Post(':id/void')
  async voidReceipt(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const { document } = await this.receiptsService.voidReceipt(
      req.user.id,
      id,
    );
    return { message: 'Receipt voided', document };
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
