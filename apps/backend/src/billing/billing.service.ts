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
    const isMaster = user.role === 'MASTER';
    const isUnlimited = isMaster || companyProfile.isUnlimited;
    const billingPeriod = this.getCurrentBillingPeriod();

    const docFilter = isMaster
      ? { companyProfileId: companyProfile.id }
      : { userId: user.id };

    const documentsUsed = await this.prisma.document.count({
      where: { ...docFilter, countedInBilling: true, billingPeriod },
    });

    const overageDocuments = await this.prisma.document.count({
      where: { ...docFilter, countedInBilling: true, billingPeriod, isOverage: true },
    });

    const remainingDocuments = isUnlimited
      ? null
      : Math.max(companyProfile.monthlyDocLimit - documentsUsed, 0);

    return {
      billingPeriod,
      planName: isMaster ? 'PRO_UNLIMITED' : companyProfile.planName,
      monthlyDocLimit: companyProfile.monthlyDocLimit,
      isUnlimited,
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
    const isMaster = user.role === 'MASTER';
    const isUnlimited = isMaster || companyProfile.isUnlimited;
    const billingPeriod = month || this.getCurrentBillingPeriod();

    const docFilter = isMaster
      ? { companyProfileId: companyProfile.id }
      : { userId: user.id };

    const documentsSent = await this.prisma.document.count({
      where: { ...docFilter, countedInBilling: true, billingPeriod },
    });

    const overageDocuments = isUnlimited ? 0 : await this.prisma.document.count({
      where: { ...docFilter, countedInBilling: true, billingPeriod, isOverage: true },
    });

    const estimatedOverageCost = isUnlimited
      ? 0
      : Number(companyProfile.overagePrice) * overageDocuments;

    return {
      month: billingPeriod,
      planName: isMaster ? 'PRO_UNLIMITED' : companyProfile.planName,
      monthlyDocLimit: companyProfile.monthlyDocLimit,
      isUnlimited,
      overagePrice: companyProfile.overagePrice,
      documentsSent,
      overageDocuments,
      estimatedOverageCost,
    };
  }
}
