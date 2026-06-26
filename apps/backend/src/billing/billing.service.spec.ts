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

// ── Model C: receipt billing dimension ──────────────────────────────────────
describe('BillingService.getCurrentUsage — receipt dimension (Model C)', () => {
  let service: BillingService;

  // document.count is called for contracts (countedInBilling) and receipts
  // (countedAsReceipt). Answer by the where filter so each dimension is
  // independently assertable regardless of call order.
  function setCounts(counts: {
    contracts?: number;
    contractOverage?: number;
    receipts?: number;
    receiptOverage?: number;
  }) {
    prismaMock.document.count.mockImplementation(async (args: any) => {
      const w = args?.where ?? {};
      if (w.countedAsReceipt) {
        return w.isReceiptOverage
          ? (counts.receiptOverage ?? 0)
          : (counts.receipts ?? 0);
      }
      if (w.countedInBilling) {
        return w.isOverage ? (counts.contractOverage ?? 0) : (counts.contracts ?? 0);
      }
      return 0;
    });
  }

  const baseProfile = {
    id: 'cp-1',
    planName: 'STARTER',
    monthlyDocLimit: 5,
    overagePrice: 5.0,
    isUnlimited: false,
    monthlyReceiptLimit: 20,
    receiptsUnlimited: false,
    receiptOveragePrice: 0.25,
    contractsEnabled: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
  });

  it('STARTER user: receipt quota is independent from the contract quota', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-1',
      role: 'USER',
      companyProfile: baseProfile,
    });
    setCounts({ contracts: 4, receipts: 5 });

    const usage = await service.getCurrentUsage('u-1');

    expect(usage.monthlyReceiptLimit).toBe(20);
    expect(usage.receiptsUsed).toBe(5);
    expect(usage.remainingReceipts).toBe(15);
    expect(usage.receiptsUnlimited).toBe(false);
    expect(usage.receiptOveragePrice).toBe(0.25);
    expect(usage.remainingDocuments).toBe(1);
  });

  it('clamps remainingReceipts at 0 when over the limit', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-1',
      role: 'USER',
      companyProfile: baseProfile,
    });
    setCounts({ receipts: 25, receiptOverage: 5 });

    const usage = await service.getCurrentUsage('u-1');

    expect(usage.remainingReceipts).toBe(0);
    expect(usage.receiptOverageDocuments).toBe(5);
  });

  it('receiptsUnlimited tenant: remainingReceipts is null', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-1',
      role: 'USER',
      companyProfile: { ...baseProfile, receiptsUnlimited: true },
    });
    setCounts({ receipts: 99 });

    const usage = await service.getCurrentUsage('u-1');

    expect(usage.receiptsUnlimited).toBe(true);
    expect(usage.remainingReceipts).toBeNull();
  });

  it('MASTER: receipts unlimited regardless of profile', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'm-1',
      role: 'MASTER',
      companyProfile: baseProfile,
    });
    setCounts({ receipts: 3 });

    const usage = await service.getCurrentUsage('m-1');

    expect(usage.receiptsUnlimited).toBe(true);
    expect(usage.remainingReceipts).toBeNull();
  });

  it('surfaces contractsEnabled (false for RECEIPTS_ONLY tenants)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-1',
      role: 'USER',
      companyProfile: { ...baseProfile, contractsEnabled: false },
    });
    setCounts({});

    const usage = await service.getCurrentUsage('u-1');

    expect(usage.contractsEnabled).toBe(false);
  });
});
