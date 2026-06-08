import { Module, forwardRef } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { BoldSignController } from './boldsign.controller';
import { ResendWebhookController } from './resend-webhook.controller';
import { PublicSignaturesController } from './public-signatures.controller';
import { DocumentsService } from './documents.service';
import { BoldSignModule } from '../boldsign/boldsign.module';
import { EmailModule } from '../email/email.module';
import { SignatureProviderModule } from '../signature-provider/signature-provider.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    forwardRef(() => SignatureProviderModule),
    BoldSignModule,
    EmailModule,
    StorageModule,
  ],
  controllers: [
    DocumentsController,
    BoldSignController,
    ResendWebhookController,
    PublicSignaturesController,
  ],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
