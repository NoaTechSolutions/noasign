import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async getCurrentUsage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyProfile: true,
      },
    });

    if (!user || !user.companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const companyProfile = user.companyProfile;
    const billingPeriod = this.getCurrentBillingPeriod();

    const documentsUsed = await this.prisma.document.count({
      where: {
        companyProfileId: companyProfile.id,
        countedInBilling: true,
        billingPeriod,
      },
    });

    const overageDocuments = await this.prisma.document.count({
      where: {
        companyProfileId: companyProfile.id,
        countedInBilling: true,
        billingPeriod,
        isOverage: true,
      },
    });

    const remainingDocuments = companyProfile.isUnlimited
      ? null
      : Math.max(companyProfile.monthlyDocLimit - documentsUsed, 0);

    return {
      billingPeriod,
      planName: companyProfile.planName,
      monthlyDocLimit: companyProfile.monthlyDocLimit,
      isUnlimited: companyProfile.isUnlimited,
      overagePrice: companyProfile.overagePrice,
      documentsUsed,
      remainingDocuments,
      overageDocuments,
    };
  }

  async getMonthlySummary(userId: string, month?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyProfile: true,
      },
    });

    if (!user || !user.companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const companyProfile = user.companyProfile;
    const billingPeriod = month || this.getCurrentBillingPeriod();

    const documentsSent = await this.prisma.document.count({
      where: {
        companyProfileId: companyProfile.id,
        countedInBilling: true,
        billingPeriod,
      },
    });

    const overageDocuments = await this.prisma.document.count({
      where: {
        companyProfileId: companyProfile.id,
        countedInBilling: true,
        billingPeriod,
        isOverage: true,
      },
    });

    const estimatedOverageCost =
      Number(companyProfile.overagePrice) * overageDocuments;

    return {
      month: billingPeriod,
      planName: companyProfile.planName,
      monthlyDocLimit: companyProfile.monthlyDocLimit,
      isUnlimited: companyProfile.isUnlimited,
      overagePrice: companyProfile.overagePrice,
      documentsSent,
      overageDocuments,
      estimatedOverageCost,
    };
  }
}
