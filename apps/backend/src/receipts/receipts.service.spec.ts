import { BadRequestException } from '@nestjs/common';
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
  companyTemplate: { findFirst: jest.fn() },
  companyProfile: { findUnique: jest.fn() },
  document: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  customer: { findMany: jest.fn() },
  documentFile: { findFirst: jest.fn(), deleteMany: jest.fn() },
  $transaction: jest.fn(),
};
const receiptPdfMock = {
  generate: jest.fn(),
  generateFromAcroFormOverlay: jest.fn(),
  generateFromAcroForm: jest.fn(),
};
const emailMock = { sendReceipt: jest.fn(), sendInvoice: jest.fn() };
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
        // Current counter tables (migrations 20260706140000/150000). The legacy
        // receiptCounter was replaced by these two atomic upsert series.
        documentSeriesCounter: {
          upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }),
        },
        userDocumentSequence: {
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

  it('a SUPERADMIN borrows another tenant’s template via receiptTemplateId; the doc stays the master’s', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'super',
      role: 'SUPERADMIN',
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
    // so borrowing never consumes the form owner's number sequence. That scoping
    // is asserted on the document.create call below (userId: 'super') and the
    // resulting REC- number; the legacy findMany max-scan was replaced by the
    // per-(user, type) userDocumentSequence upsert (migration 20260706150000).
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
        // Current counter tables (migrations 20260706140000/150000). The legacy
        // receiptCounter was replaced by these two atomic upsert series.
        documentSeriesCounter: {
          upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }),
        },
        userDocumentSequence: {
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

  it('rejects a receipt whose issue date is before Jan 1 of the current year', async () => {
    await expect(
      service.createReceipt('u', { ...BASE_DTO, date: '06/09/2020' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.document.create).not.toHaveBeenCalled();
  });

  it('defers a future-dated receipt: DRAFT + isDeferred, never sent even with send=true', async () => {
    await service.createReceipt('u', {
      ...SEND_DTO,
      date: '12/31/2099',
      notifyOnIssueDate: true,
    } as never);

    // Deferred → the email is NOT sent at create.
    expect(emailMock.sendReceipt).not.toHaveBeenCalled();
    const createData = prismaMock.document.create.mock.calls[0][0].data;
    expect(createData.isDeferred).toBe(true);
    expect(createData.notifyOnIssueDate).toBe(true);
  });

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

describe('ReceiptsService — getReceiptStats', () => {
  let service: ReceiptsService;

  beforeEach(async () => {
    jest.clearAllMocks();
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

  it('counts by real receipt status (VOID derived from supersededAt) and sums $ for the current period', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      companyProfileId: 'tenant-1',
    });
    prismaMock.document.groupBy.mockResolvedValue([]);

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    prismaMock.document.findMany.mockResolvedValue([
      // SENT this month, counted → summed
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: true,
        billingPeriod: period,
        data: { dataJson: { amount: 100 } },
      },
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: true,
        billingPeriod: period,
        data: { dataJson: { amount: 50.5 } },
      },
      // VOID (supersededAt set) — counts as void, not sent; still counted toward billing this month
      {
        status: 'SENT',
        supersededAt: new Date(),
        countedAsReceipt: true,
        billingPeriod: period,
        data: { dataJson: { amount: 999 } },
      },
      // DRAFT / SEND_FAILED / CANCELLED — not counted, no amount
      {
        status: 'DRAFT',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        data: { dataJson: { amount: 0 } },
      },
      {
        status: 'SEND_FAILED',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        data: null,
      },
      {
        status: 'CANCELLED',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        data: { dataJson: {} },
      },
      // SENT in a PAST period — excluded from this month's $
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: true,
        billingPeriod: '2020-01',
        data: { dataJson: { amount: 777 } },
      },
    ]);

    const stats = await service.getReceiptStats('user-1');

    expect(stats.byStatus).toEqual({
      draft: 1,
      sent: 3,
      sendFailed: 1,
      cancelled: 1,
      void: 1,
      scheduled: 0,
    });
    expect(stats.amountThisMonth).toBeCloseTo(1149.5); // 100 + 50.5 + 999 (counted this period)
    expect(stats.receiptsThisMonth).toBe(3);
    expect(stats.totalIssued).toBe(3); // active (non-void) SENT
    expect(stats.billingPeriod).toBe(period);
  });

  it('returns zeroes when the tenant has no receipts', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      companyProfileId: 'tenant-2',
    });
    prismaMock.document.findMany.mockResolvedValue([]);
    prismaMock.document.groupBy.mockResolvedValue([]);

    const stats = await service.getReceiptStats('user-2');

    expect(stats.byStatus).toEqual({
      draft: 0,
      sent: 0,
      sendFailed: 0,
      cancelled: 0,
      void: 0,
      scheduled: 0,
    });
    expect(stats.amountThisMonth).toBe(0);
    expect(stats.totalIssued).toBe(0);
  });

  it('exposes tenant-wide documentCounts split by type (invoices / receipts / signatures / total)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      companyProfileId: 'tenant-3',
    });
    prismaMock.document.groupBy.mockResolvedValue([]);
    // DIRECT_PDF documents (receipts + invoices) come from findMany — the same
    // array the receipt stats already read. Type is derived from documentType.code.
    prismaMock.document.findMany.mockResolvedValue([
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        sentAt: null,
        documentType: { code: 'PAYMENT_RECEIPT' },
        data: { dataJson: {} },
      },
      {
        status: 'DRAFT',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        sentAt: null,
        documentType: { code: 'PAYMENT_RECEIPT' },
        data: { dataJson: {} },
      },
      {
        status: 'DRAFT',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        sentAt: null,
        documentType: { code: 'INVOICE' },
        data: { dataJson: {} },
      },
    ]);
    // Signature (BoldSign) documents are counted with a separate query — they are
    // NOT part of the DIRECT_PDF findMany above.
    prismaMock.document.count.mockResolvedValue(4);

    const stats = await service.getReceiptStats('user-3');

    expect(stats.documentCounts).toEqual({
      invoices: 1,
      receipts: 2,
      signatures: 4,
      total: 7,
    });
    // The signature count filters the tenant's BOLDSIGN document types.
    expect(prismaMock.document.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyProfileId: 'tenant-3',
          documentType: { generationMode: 'BOLDSIGN' },
        }),
      }),
    );
  });

  it('splits this-month counts by type (monthlyCounts) so the popup Total matches the card', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      companyProfileId: 'tenant-4',
    });
    prismaMock.document.groupBy.mockResolvedValue([]);

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    prismaMock.document.findMany.mockResolvedValue([
      // Receipt counted this period → receipts month count.
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: true,
        billingPeriod: period,
        sentAt: now,
        documentType: { code: 'PAYMENT_RECEIPT' },
        data: { dataJson: { amount: 100 } },
      },
      // Invoice SENT this period → invoices month count.
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: false,
        billingPeriod: null,
        sentAt: now,
        documentType: { code: 'INVOICE' },
        data: { dataJson: { gran_total: '50.00' } },
      },
      // Receipt from a PAST period → excluded from this month's split.
      {
        status: 'SENT',
        supersededAt: null,
        countedAsReceipt: true,
        billingPeriod: '2020-01',
        sentAt: new Date('2020-01-15'),
        documentType: { code: 'PAYMENT_RECEIPT' },
        data: { dataJson: { amount: 999 } },
      },
    ]);

    const stats = await service.getReceiptStats('user-4');

    expect(stats.monthlyCounts).toEqual({
      receipts: 1,
      invoices: 1,
      total: 2,
    });
    // Popup Total must equal the "Receipts this month" card figure.
    expect(stats.monthlyCounts.total).toBe(stats.receiptsThisMonth);
  });
});

// ── "Send now" for a SCHEDULED (deferred) invoice / receipt ─────────────────
describe('ReceiptsService — send now (un-defer)', () => {
  let service: ReceiptsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    r2Mock.isConfigured.mockReturnValue(false);
    receiptPdfMock.generateFromAcroFormOverlay.mockResolvedValue(
      Buffer.from('pdf'),
    );
    prismaMock.document.update.mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));
    prismaMock.documentFile.deleteMany.mockResolvedValue({ count: 0 });

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

  it('sendInvoiceNow un-defers a scheduled invoice to today, then sends (no deferred throw)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u',
      companyProfileId: 'wp',
    });
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'inv1',
      documentNumber: 'INV-2026-0001',
      status: 'DRAFT',
      companyProfileId: 'wp',
      customerId: null,
      isDeferred: true,
      notifyOnIssueDate: true,
      deferredNotifiedAt: null,
      issueDate: new Date('2099-12-31'),
      data: {
        dataJson: {
          receipt_number: 'INV-2026-0001',
          quantity: '2',
          price: '50.00',
          first_name: 'A',
          last_name: 'B',
          invoice_date: '12/31/2099',
        },
      },
      receiptTemplate: { id: 'rt', ...TEMPLATE },
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      timezone: 'America/New_York',
      companyName: 'WP',
    });
    // Isolate un-defer: stub the actual send path.
    const send = jest
      .spyOn(service, 'sendDraftInvoice')
      .mockResolvedValue({ document: { id: 'inv1', status: 'SENT' } } as never);

    await expect(service.sendInvoiceNow('u', 'inv1')).resolves.toEqual({
      document: { id: 'inv1', status: 'SENT' },
    });

    const undefer = prismaMock.document.update.mock.calls[0][0].data;
    expect(undefer.isDeferred).toBe(false);
    expect(undefer.notifyOnIssueDate).toBe(false);
    expect(undefer.deferredNotifiedAt).toBeNull();
    expect(undefer.issueDate).toBeInstanceOf(Date);
    // dataJson.invoice_date was rewritten to today (no longer the future date).
    expect(undefer.data.update.dataJson.invoice_date).not.toBe('12/31/2099');
    expect(undefer.data.update.dataJson.invoice_date).toMatch(
      /^\d{2}\/\d{2}\/\d{4}$/,
    );
    expect(send).toHaveBeenCalledWith('u', 'inv1');
  });

  it('sendReceiptNow un-defers a scheduled receipt to today, then sends', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u',
      companyProfileId: 'wp',
    });
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'rec1',
      documentNumber: 'REC-2026-0001',
      status: 'DRAFT',
      companyProfileId: 'wp',
      customerId: null,
      isDeferred: true,
      notifyOnIssueDate: true,
      deferredNotifiedAt: null,
      issueDate: new Date('2099-12-31'),
      data: {
        dataJson: {
          date: '12/31/2099',
          client: 'Cli',
          amount: 100,
          email: 'c@example.com',
        },
      },
      receiptTemplate: { id: 'rt', ...TEMPLATE },
      companyProfile: { companyName: 'WP' },
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      timezone: 'America/New_York',
    });
    const send = jest
      .spyOn(service, 'resendReceipt')
      .mockResolvedValue({ document: { id: 'rec1', status: 'SENT' } } as never);

    await expect(service.sendReceiptNow('u', 'rec1')).resolves.toEqual({
      document: { id: 'rec1', status: 'SENT' },
    });

    const undefer = prismaMock.document.update.mock.calls[0][0].data;
    expect(undefer.isDeferred).toBe(false);
    expect(undefer.notifyOnIssueDate).toBe(false);
    expect(undefer.deferredNotifiedAt).toBeNull();
    expect(undefer.issueDate).toBeInstanceOf(Date);
    // The printed `date` was rewritten to today's MM/DD/YYYY.
    expect(undefer.data.update.dataJson.date).not.toBe('12/31/2099');
    expect(undefer.data.update.dataJson.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    // The cached PDF is dropped so the next send regenerates it.
    expect(prismaMock.documentFile.deleteMany).toHaveBeenCalledWith({
      where: { documentId: 'rec1', fileType: 'RECEIPT' },
    });
    expect(send).toHaveBeenCalledWith('u', 'rec1');
  });

  it('sendInvoiceNow on a NON-deferred draft skips the un-defer and just sends', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u',
      companyProfileId: 'wp',
    });
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'inv2',
      documentNumber: 'INV-2026-0002',
      status: 'DRAFT',
      companyProfileId: 'wp',
      customerId: null,
      isDeferred: false,
      notifyOnIssueDate: false,
      deferredNotifiedAt: null,
      issueDate: new Date('2026-01-01'),
      data: { dataJson: { receipt_number: 'INV-2026-0002' } },
      receiptTemplate: { id: 'rt', ...TEMPLATE },
    });
    const send = jest
      .spyOn(service, 'sendDraftInvoice')
      .mockResolvedValue({ document: { id: 'inv2', status: 'SENT' } } as never);

    await service.sendInvoiceNow('u', 'inv2');

    // No un-defer write happened — went straight to the send path.
    expect(prismaMock.document.update).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith('u', 'inv2');
  });
});
