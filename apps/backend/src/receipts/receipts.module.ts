import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { InvoicesController } from './invoices.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [EmailModule, StorageModule],
  controllers: [ReceiptsController, InvoicesController],
  providers: [ReceiptsService, ReceiptPdfService],
  exports: [ReceiptsService, ReceiptPdfService],
})
export class ReceiptsModule {}
