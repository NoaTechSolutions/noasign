import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import type { ContactFormDto } from './dto/contact-form.dto';

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async submit(dto: ContactFormDto): Promise<void> {
    await this.emailService.sendContactForm({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      lang: dto.lang,
    });
  }
}
