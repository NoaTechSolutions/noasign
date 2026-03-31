import { Module } from '@nestjs/common';
import { BoldSignService } from './boldsign.service';

@Module({
  providers: [BoldSignService],
  exports: [BoldSignService],
})
export class BoldSignModule {}
