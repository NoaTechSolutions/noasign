import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptPdfService],
  exports: [ReceiptsService, ReceiptPdfService],
})
export class ReceiptsModule {}
