import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TurnstileGuard } from './contact.guard';
import { ContactService } from './contact.service';
import { ContactFormDto } from './dto/contact-form.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(TurnstileGuard)
  async submit(@Body() dto: ContactFormDto): Promise<{ ok: true }> {
    await this.contactService.submit(dto);
    return { ok: true };
  }
}
