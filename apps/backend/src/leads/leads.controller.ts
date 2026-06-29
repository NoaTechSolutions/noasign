import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

// Public (no auth guard) — submitted by external signers from the post-signature
// confirmation page. Rate-limited in main.ts (POST:/public/leads).
@Controller('public/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLeadDto): Promise<{ ok: true }> {
    await this.leadsService.create(dto);
    return { ok: true };
  }
}
