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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

/**
 * Invoice creation + view — DIRECT_PDF, never BoldSign. Separate route from
 * receipts so the receipt path is untouched; both are served by ReceiptsService.
 */
@Controller('documents/invoice')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  async createInvoice(
    @Req() req: { user: { id: string } },
    @Body() body: CreateInvoiceDto,
  ) {
    const result = await this.receiptsService.createInvoice(req.user.id, body);
    const { document, receiptNumber } = result;
    const sendError = 'sendError' in result ? result.sendError : null;
    const failed = document.status === 'SEND_FAILED';
    return {
      message: failed
        ? 'Invoice created, but the email could not be sent'
        : body.send
          ? 'Invoice sent'
          : 'Invoice created',
      receiptNumber,
      document,
      sendError: sendError ?? null,
    };
  }

  // Edit a DRAFT invoice — merges the wizard's flat data over the stored data,
  // recomputes money, re-renders the PDF. Same body shape as create.
  @Patch(':id')
  async updateInvoice(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateInvoiceDto,
  ) {
    const { document } = await this.receiptsService.updateInvoice(
      req.user.id,
      id,
      body,
    );
    return { message: 'Invoice updated', document };
  }

  // Void an invoice → VOID (supersededAt), clearing any deferred schedule. Same
  // VOID treatment as receipts; used by the "cancel/discard" action.
  @Post(':id/void')
  async voidInvoice(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const { document } = await this.receiptsService.voidInvoice(req.user.id, id);
    return { message: 'Invoice voided', document };
  }

  // Finalize (send) a DRAFT invoice — the manual "finalize" action, e.g. once a
  // deferred invoice reaches its issue date. Blocked while still deferred.
  @Post(':id/send')
  async sendInvoice(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.receiptsService.sendDraftInvoice(req.user.id, id);
    const sendError = 'sendError' in result ? result.sendError : null;
    const failed = result.document.status === 'SEND_FAILED';
    return {
      message: failed ? 'Invoice send failed' : 'Invoice sent',
      document: result.document,
      sendError: sendError ?? null,
    };
  }

  // "Send now" for a SCHEDULED (deferred) draft invoice — finalizes it TODAY
  // (un-defers to today's date, rebuilds the PDF) and sends. A non-deferred draft
  // just sends. Same response shape as :id/send.
  @Post(':id/send-now')
  async sendInvoiceNow(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.receiptsService.sendInvoiceNow(req.user.id, id);
    const sendError = 'sendError' in result ? result.sendError : null;
    const failed = result.document.status === 'SEND_FAILED';
    return {
      message: failed ? 'Invoice send failed' : 'Invoice sent',
      document: result.document,
      sendError: sendError ?? null,
    };
  }

  // K6: resend a SENT (or SEND_FAILED) invoice's email — re-renders the PDF from
  // stored data and re-emails it, rate-limited by the shared receipt resend policy.
  @Post(':id/resend')
  async resendInvoice(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.receiptsService.resendInvoice(req.user.id, id);
    const sendError = 'sendError' in result ? result.sendError : null;
    const failed = result.document.status === 'SEND_FAILED';
    return {
      message: failed ? 'Invoice resend failed' : 'Invoice resent',
      document: result.document,
      sendError: sendError ?? null,
    };
  }

  // Regenerated-on-the-fly invoice PDF, streamed inline (same pipeline as create).
  @Get(':id/pdf')
  async getInvoicePdf(
    @Req() req: { user: { id: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    await this.receiptsService.streamInvoicePdf(req.user.id, id, res);
  }
}
