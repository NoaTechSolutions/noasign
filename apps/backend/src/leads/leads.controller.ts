import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { EnrichLeadDto } from './dto/enrich-lead.dto';

// Public (no auth guard) — submitted by external signers from the post-signature
// confirmation page. Rate-limited in main.ts (POST + PATCH /public/leads).
@Controller('public/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Step 1 — capture the email, return the lead id for step-2 enrichment.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLeadDto): Promise<{ ok: true; id: string }> {
    const { id } = await this.leadsService.create(dto);
    return { ok: true, id };
  }

  // Step 2 — merge optional name/phone into the lead from step 1.
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async enrich(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EnrichLeadDto,
  ): Promise<{ ok: true }> {
    await this.leadsService.enrich(id, dto);
    return { ok: true };
  }
}
