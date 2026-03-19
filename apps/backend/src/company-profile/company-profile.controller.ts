import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { CompanyProfileService } from './company-profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Controller('company-profile')
@UseGuards(JwtAuthGuard)
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @Get('me')
  async getMyCompanyProfile(@Req() req: any) {
    return this.companyProfileService.getMyCompanyProfile(req.user.id);
  }

  @Patch('me')
  async updateMyCompanyProfile(
    @Req() req: any,
    @Body() body: UpdateCompanyProfileDto,
  ) {
    return this.companyProfileService.updateMyCompanyProfile(req.user.id, body);
  }
}