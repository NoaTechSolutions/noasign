import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { EnrichLeadDto } from './dto/enrich-lead.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Step 1 — persist a marketing lead from just the email. Email is normalized;
  // source defaults server-side so the client can't blank it. Returns the id so
  // step 2 can enrich this exact lead. Fires an internal notification (the email
  // is captured even if the signer abandons step 2).
  async create(dto: CreateLeadDto): Promise<{ id: string }> {
    const email = dto.email.trim().toLowerCase();
    const source = dto.source?.trim() || 'signature-complete';

    const lead = await this.prisma.lead.create({
      data: { email, source },
      select: { id: true },
    });

    await this.notify({ email, source, stage: 'captured' });

    return { id: lead.id };
  }

  // Step 2 — merge optional follow-up details into the lead created in step 1.
  // Only provided fields are written. Sends an "enriched" notification with the
  // new details. Throws if the id doesn't exist or nothing was provided.
  async enrich(id: string, dto: EnrichLeadDto): Promise<void> {
    const name = dto.name?.trim() || undefined;
    const phone = dto.phone?.trim() || undefined;

    if (!name && !phone) {
      throw new BadRequestException('Provide a name or a phone number.');
    }

    const existing = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, email: true, source: true },
    });
    if (!existing) {
      throw new NotFoundException('Lead not found.');
    }

    await this.prisma.lead.update({
      where: { id },
      data: { name, phone },
    });

    await this.notify({
      email: existing.email,
      source: existing.source,
      name,
      phone,
      stage: 'enriched',
    });
  }

  // Internal heads-up email. Best-effort: a delivery failure must never break
  // lead capture (the row is already saved), so we swallow + log errors here.
  private async notify(payload: {
    email: string;
    source: string;
    name?: string;
    phone?: string;
    stage: 'captured' | 'enriched';
  }): Promise<void> {
    try {
      await this.email.sendLeadNotification(payload);
    } catch (err) {
      this.logger.error(
        `[LeadsService] Lead notification (${payload.stage}) failed for ${payload.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
