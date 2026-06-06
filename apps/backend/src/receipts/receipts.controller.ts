import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

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
}
