import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  // Persist a marketing lead. Email is normalized; source defaults server-side so
  // the client can't blank it.
  async create(dto: CreateLeadDto): Promise<void> {
    await this.prisma.lead.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        source: dto.source?.trim() || 'signature-complete',
      },
    });
  }
}
