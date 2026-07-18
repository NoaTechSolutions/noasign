import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LegalDocType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { resolveClientIp } from '../common/client-ip';
import { LegalService } from './legal.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  // Public: renders the page + the popup links to the EXACT version being accepted.
  // 404 (from the service) if there is no servable active version — a dead link is
  // surfaced loudly, never silently served empty.
  @Get(':docType/active')
  async getActive(@Param('docType') docType: string) {
    return this.legalService.getActiveVersion(this.parseDocType(docType));
  }

  // Authed: does the current user still need to accept anything?
  @Get('acceptance-status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: { user: { id: string } }) {
    return this.legalService.getAcceptanceStatus(req.user.id);
  }

  // Authed: record acceptance of every servable active version not yet accepted,
  // capturing the client IP + user agent.
  @Post('accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Req() req: Request & { user: { id: string } }) {
    const ip = resolveClientIp(req);
    const ua = req.headers['user-agent'] ?? null;
    return this.legalService.recordAcceptance(
      req.user.id,
      ip,
      typeof ua === 'string' ? ua : null,
    );
  }

  private parseDocType(value: string): LegalDocType {
    const upper = value.toUpperCase();
    if (!(upper in LegalDocType)) {
      throw new BadRequestException(`Unknown legal doc type: ${value}`);
    }
    return upper as LegalDocType;
  }
}
