import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { CompanyProfileService } from './company-profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { SetTimezoneDto } from './dto/set-timezone.dto';

@Controller('company-profile')
@UseGuards(JwtAuthGuard)
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @Get('me')
  async getMyCompanyProfile(@Req() req: { user: { id: string } }) {
    return this.companyProfileService.getMyCompanyProfile(req.user.id);
  }

  @Patch('me')
  async updateMyCompanyProfile(
    @Req() req: { user: { id: string } },
    @Body() body: UpdateCompanyProfileDto,
  ) {
    return this.companyProfileService.updateMyCompanyProfile(req.user.id, body);
  }

  // Auto-detected tenant timezone (browser). First-write-wins, open to all
  // authenticated users (incl. INDIVIDUALs) — separate from the gated profile edit.
  @Patch('timezone')
  async setTimezone(
    @Req() req: { user: { id: string } },
    @Body() body: SetTimezoneDto,
  ) {
    return this.companyProfileService.setTimezoneIfUnset(
      req.user.id,
      body.timezone,
    );
  }
}
