import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

// PrismaModule is @Global, so PrismaService is available without importing it.
@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
