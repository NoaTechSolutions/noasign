import { Module, forwardRef } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { BoldSignController } from './boldsign.controller';
import { PublicSignaturesController } from './public-signatures.controller';
import { DocumentsService } from './documents.service';
import { BoldSignModule } from '../boldsign/boldsign.module';
import { SignatureProviderModule } from '../signature-provider/signature-provider.module';

@Module({
  imports: [forwardRef(() => SignatureProviderModule), BoldSignModule],
  controllers: [
    DocumentsController,
    BoldSignController,
    PublicSignaturesController,
  ],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
