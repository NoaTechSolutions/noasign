import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { EmailModule } from '../email/email.module';

// PrismaModule is @Global, so PrismaService is available without importing it.
// EmailModule is imported for the internal lead-notification emails.
@Module({
  imports: [EmailModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
