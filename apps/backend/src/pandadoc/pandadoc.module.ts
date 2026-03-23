import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module';
import { PandaDocController } from './pandadoc.controller';
import { PandaDocService } from './pandadoc.service';

@Module({
  imports: [ConfigModule, forwardRef(() => DocumentsModule)],
  controllers: [PandaDocController],
  providers: [PandaDocService],
  exports: [PandaDocService],
})
export class PandaDocModule {}
