import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { DeferredNotifyService } from './deferred-notify.service';

const prismaMock = {
  document: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};
const notificationsMock = { notify: jest.fn() };

describe('DeferredNotifyService — scanDueDeferredDocuments', () => {
  let service: DeferredNotifyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeferredNotifyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationService, useValue: notificationsMock },
      ],
    }).compile();
    service = module.get<DeferredNotifyService>(DeferredNotifyService);
  });

  it('only scans deferred, opted-in, not-yet-notified documents', async () => {
    prismaMock.document.findMany.mockResolvedValue([]);
    await service.scanDueDeferredDocuments();
    expect(prismaMock.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isDeferred: true,
          notifyOnIssueDate: true,
          deferredNotifiedAt: null,
          issueDate: { not: null },
        }),
      }),
    );
  });

  it('notifies a due deferred doc exactly once and stamps deferredNotifiedAt', async () => {
    prismaMock.document.findMany.mockResolvedValue([
      {
        id: 'd1',
        userId: 'u1',
        documentNumber: 'INV-2026-0001',
        issueDate: new Date('2020-01-01'),
        companyProfile: { timezone: null },
        documentType: { code: 'INVOICE' },
      },
    ]);

    const count = await service.scanDueDeferredDocuments();

    expect(count).toBe(1);
    expect(notificationsMock.notify).toHaveBeenCalledTimes(1);
    expect(notificationsMock.notify).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        type: 'deferred_ready',
        documentId: 'd1',
        documentNumber: 'INV-2026-0001',
        docKind: 'invoice',
      }),
    );
    expect(prismaMock.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'd1' },
        data: expect.objectContaining({ deferredNotifiedAt: expect.any(Date) }),
      }),
    );
  });

  it('does NOT notify a deferred doc whose issue date has not arrived yet', async () => {
    prismaMock.document.findMany.mockResolvedValue([
      {
        id: 'd2',
        userId: 'u2',
        documentNumber: 'REC-2026-0001',
        issueDate: new Date('2099-12-31'),
        companyProfile: { timezone: null },
        documentType: { code: 'PAYMENT_RECEIPT' },
      },
    ]);

    const count = await service.scanDueDeferredDocuments();

    expect(count).toBe(0);
    expect(notificationsMock.notify).not.toHaveBeenCalled();
    expect(prismaMock.document.update).not.toHaveBeenCalled();
  });
});
