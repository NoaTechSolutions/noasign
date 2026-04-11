import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  document: {
    count: jest.fn(),
  },
};

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCurrentUsage calculates remaining documents for limited plans', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'USER',
      companyProfile: {
        id: 'company-1',
        planName: 'LAUNCH',
        monthlyDocLimit: 5,
        isUnlimited: false,
        overagePrice: 5,
      },
    });
    prismaMock.document.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

    const result = await service.getCurrentUsage('user-1');

    expect(result.documentsUsed).toBe(3);
    expect(result.remainingDocuments).toBe(2);
    expect(result.overageDocuments).toBe(1);
  });

  it('getCurrentUsage returns null remainingDocuments for unlimited plans', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'MASTER',
      companyProfile: {
        id: 'company-1',
        planName: 'PRO_UNLIMITED',
        monthlyDocLimit: 0,
        isUnlimited: true,
        overagePrice: 0,
      },
    });
    prismaMock.document.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(0);

    const result = await service.getCurrentUsage('user-1');

    expect(result.isUnlimited).toBe(true);
    expect(result.remainingDocuments).toBeNull();
  });

  it('getMonthlySummary estimates overage cost using the requested month', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'USER',
      companyProfile: {
        id: 'company-1',
        planName: 'SCALE',
        monthlyDocLimit: 15,
        isUnlimited: false,
        overagePrice: 7.5,
      },
    });
    prismaMock.document.count
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(3);

    const result = await service.getMonthlySummary('user-1', '2026-04');

    expect(result.month).toBe('2026-04');
    expect(result.documentsSent).toBe(18);
    expect(result.overageDocuments).toBe(3);
    expect(result.estimatedOverageCost).toBe(22.5);
  });

  it('throws when company profile is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.getCurrentUsage('user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
