import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { R2Service } from '../storage/r2.service';
import { ReceiptPdfService } from './receipt-pdf.service';

const prismaMock = {
  user: { findUnique: jest.fn() },
  documentType: { findUnique: jest.fn() },
  formDefinition: { findFirst: jest.fn() },
  receiptTemplate: { findFirst: jest.fn() },
  companyProfile: { findUnique: jest.fn() },
  document: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  documentFile: { findFirst: jest.fn(), deleteMany: jest.fn() },
  $transaction: jest.fn(),
};
const receiptPdfMock = { generate: jest.fn() };
const emailMock = { sendReceipt: jest.fn() };
const r2Mock = {
  isConfigured: jest.fn().mockReturnValue(false),
  putObject: jest.fn(),
  getObject: jest.fn(),
};

const TEMPLATE = {
  numberFormat: 'REC-{YYYY}-{NNNN}',
  basePdfPath: 'x',
  fieldMappingJson: {},
  pageWidth: 612,
  pageHeight: 792,
  mediaBoxOffsetY: 0,
};

const BASE_DTO = {
  client: 'Cli',
  amount: 100,
  date: '06/09/2026',
  payment_method: 'CASH',
  payment_for: 'x',
} as const;

describe('ReceiptsService — superadmin borrow', () => {
  let service: ReceiptsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    r2Mock.isConfigured.mockReturnValue(false);
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        receiptCounter: {
          upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }),
        },
      }),
    );
    prismaMock.document.findMany.mockResolvedValue([]);
    prismaMock.document.create.mockResolvedValue({
      id: 'doc',
      documentNumber: 'PAYMENT_RECEIPT-000001',
      status: 'DRAFT',
    });
    receiptPdfMock.generate.mockResolvedValue(Buffer.from('pdf'));
    prismaMock.documentType.findUnique.mockResolvedValue({
      id: 'dt',
      code: 'PAYMENT_RECEIPT',
    });
    prismaMock.formDefinition.findFirst.mockResolvedValue({ id: 'f' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
        { provide: R2Service, useValue: r2Mock },
        { provide: ReceiptPdfService, useValue: receiptPdfMock },
      ],
    }).compile();
    service = module.get<ReceiptsService>(ReceiptsService);
  });

  it('a MASTER borrows another tenant’s template via receiptTemplateId; the doc stays the master’s', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'super',
      role: 'MASTER',
      companyProfileId: 'nts',
    });
    prismaMock.receiptTemplate.findFirst.mockResolvedValue({
      id: 'rt-wp',
      ...TEMPLATE,
    });

    const result = await service.createReceipt('super', {
      ...BASE_DTO,
      receiptTemplateId: 'rt-wp',
    } as never);

    // Template fetched by the passed id (borrow), NOT by the creator's company.
    expect(prismaMock.receiptTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 'rt-wp', isActive: true },
    });
    // The internal documentNumber is scoped to the CREATOR (super) — not global —
    // so borrowing never consumes the form owner's number sequence.
    expect(prismaMock.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'super' }),
      }),
    );
    // Document belongs to the creator (super / nts) with the borrowed template;
    // the REC- counter uses the creator's tenant → REC-2026-0001.
    expect(prismaMock.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'super',
          companyProfileId: 'nts',
          receiptTemplateId: 'rt-wp',
        }),
      }),
    );
    expect(result.receiptNumber).toBe('REC-2026-0001');
  });

  it('a non-master ignores receiptTemplateId and uses its own company template', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u',
      role: 'USER',
      companyProfileId: 'wp',
    });
    prismaMock.receiptTemplate.findFirst.mockResolvedValue({
      id: 'rt-own',
      ...TEMPLATE,
    });

    await service.createReceipt('u', {
      ...BASE_DTO,
      receiptTemplateId: 'rt-wp',
    } as never);

    expect(prismaMock.receiptTemplate.findFirst).toHaveBeenCalledWith({
      where: { companyProfileId: 'wp', isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  });
});

// ── Model C: receipt billing on SEND (decisions B + C) ──────────────────────
describe('ReceiptsService — receipt billing on send', () => {
  let service: ReceiptsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    r2Mock.isConfigured.mockReturnValue(false);
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        receiptCounter: {
          upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }),
        },
      }),
    );
    prismaMock.document.findMany.mockResolvedValue([]);
    prismaMock.document.create.mockResolvedValue({
      id: 'doc',
      documentNumber: 'PAYMENT_RECEIPT-000001',
      status: 'DRAFT',
    });
    prismaMock.document.update.mockImplementation(async (args: any) => ({
      id: 'doc',
      ...args.data,
    }));
    receiptPdfMock.generate.mockResolvedValue(Buffer.from('pdf'));
    prismaMock.documentType.findUnique.mockResolvedValue({
      id: 'dt',
      code: 'PAYMENT_RECEIPT',
    });
    prismaMock.formDefinition.findFirst.mockResolvedValue({ id: 'f' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u',
      role: 'USER',
      companyProfileId: 'wp',
    });
    prismaMock.receiptTemplate.findFirst.mockResolvedValue({
      id: 'rt',
      ...TEMPLATE,
    });
    emailMock.sendReceipt.mockResolvedValue({ id: 'msg-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
        { provide: R2Service, useValue: r2Mock },
        { provide: ReceiptPdfService, useValue: receiptPdfMock },
      ],
    }).compile();
    service = module.get<ReceiptsService>(ReceiptsService);
  });

  const SEND_DTO = {
    ...BASE_DTO,
    send: true,
    recipientEmail: 'c@example.com',
  } as const;

  it('counts the receipt on first send (under limit → not overage)', async () => {
    // STARTER tenant: limit 20, 5 already used this period.
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyName: 'WP',
      receiptsUnlimited: false,
      monthlyReceiptLimit: 20,
    });
    prismaMock.document.count.mockResolvedValue(5);

    await service.createReceipt('u', SEND_DTO as never);

    const sentUpdate = prismaMock.document.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SENT',
    );
    expect(sentUpdate).toBeDefined();
    expect(sentUpdate[0].data.countedAsReceipt).toBe(true);
    expect(sentUpdate[0].data.isReceiptOverage).toBe(false);
  });

  it('marks overage when at/over the limit', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyName: 'WP',
      receiptsUnlimited: false,
      monthlyReceiptLimit: 20,
    });
    prismaMock.document.count.mockResolvedValue(20);

    await service.createReceipt('u', SEND_DTO as never);

    const sentUpdate = prismaMock.document.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SENT',
    );
    expect(sentUpdate[0].data.countedAsReceipt).toBe(true);
    expect(sentUpdate[0].data.isReceiptOverage).toBe(true);
  });

  it('does NOT count a reissue (decision C)', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyName: 'WP',
      receiptsUnlimited: false,
      monthlyReceiptLimit: 20,
    });
    prismaMock.document.count.mockResolvedValue(5);

    await service.createReceipt('u', SEND_DTO as never, {
      supersedesId: 'orig',
    });

    const sentUpdate = prismaMock.document.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SENT',
    );
    expect(sentUpdate).toBeDefined();
    expect(sentUpdate[0].data.countedAsReceipt).toBeUndefined();
  });

  it('receiptsUnlimited tenant counts but never goes overage', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyName: 'WP',
      receiptsUnlimited: true,
      monthlyReceiptLimit: 0,
    });
    prismaMock.document.count.mockResolvedValue(999);

    await service.createReceipt('u', SEND_DTO as never);

    const sentUpdate = prismaMock.document.update.mock.calls.find(
      (c: any) => c[0]?.data?.status === 'SENT',
    );
    expect(sentUpdate[0].data.countedAsReceipt).toBe(true);
    expect(sentUpdate[0].data.isReceiptOverage).toBe(false);
  });
});
