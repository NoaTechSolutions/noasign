import { Module, forwardRef } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PandaDocModule } from '../pandadoc/pandadoc.module';

@Module({
  imports: [forwardRef(() => PandaDocModule)],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
