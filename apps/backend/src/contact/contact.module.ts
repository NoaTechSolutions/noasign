import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { TurnstileGuard } from './contact.guard';

@Module({
  imports: [EmailModule],
  controllers: [ContactController],
  providers: [ContactService, TurnstileGuard],
})
export class ContactModule {}
