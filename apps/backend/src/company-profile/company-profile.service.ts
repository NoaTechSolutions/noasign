import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { isValidTimeZone } from '../common/tenant-date';

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
      throw new ForbiddenException(
        'Individual users cannot update the company profile',
      );
    }

    const sanitized = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() || null : value,
      ]),
    );

    return this.prisma.companyProfile.update({
      where: { id: user.companyProfileId },
      data: sanitized,
    });
  }

  /**
   * Set the tenant's IANA timezone from the browser-detected value, FIRST-WRITE-WINS:
   * only writes when the tenant has none yet (NULL). Never overwrites an existing
   * value (so it can't flip between users in different zones, and stays stable).
   * Open to ALL authenticated users — including INDIVIDUALs — since it's a
   * low-risk auto-detection of their OWN tenant's zone, not a profile edit.
   */
  async setTimezoneIfUnset(userId: string, timezone: string) {
    if (!isValidTimeZone(timezone)) {
      throw new BadRequestException('Invalid timezone');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyProfileId: true },
    });
    if (!user?.companyProfileId) {
      throw new NotFoundException('Company profile not found');
    }
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: user.companyProfileId },
      select: { timezone: true },
    });
    if (profile?.timezone) {
      // Already detected — leave it untouched.
      return { timezone: profile.timezone };
    }
    const updated = await this.prisma.companyProfile.update({
      where: { id: user.companyProfileId },
      data: { timezone },
      select: { timezone: true },
    });
    return { timezone: updated.timezone };
  }
}
