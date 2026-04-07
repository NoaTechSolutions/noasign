import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class CompanyProfileService {
  constructor(private prisma: PrismaService) {}

  async getMyCompanyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyProfileId: true,
      },
    });

    if (!user?.companyProfileId) {
      throw new NotFoundException('Company profile not found');
    }

    const companyProfile = await this.prisma.companyProfile.findUnique({
      where: { id: user.companyProfileId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    return companyProfile;
  }

  async updateMyCompanyProfile(userId: string, data: UpdateCompanyProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyProfileId: true,
        role: true,
        accountType: true,
      },
    });

    if (!user?.companyProfileId) {
      throw new NotFoundException('Company profile not found');
    }

    if (user.accountType === 'INDIVIDUAL') {
      throw new ForbiddenException('Individual users cannot update the company profile');
    }

    const sanitized = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? (value.trim() || null) : value,
      ]),
    );

    return this.prisma.companyProfile.update({
      where: { id: user.companyProfileId },
      data: sanitized,
    });
  }
}
