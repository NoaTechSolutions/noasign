import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
    const { document, receiptNumber } =
      await this.receiptsService.createInvoice(req.user.id, body);
    return { message: 'Invoice created', receiptNumber, document };
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
