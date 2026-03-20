import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  documentType: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  formDefinition: {
    findUnique: jest.fn(),
  },
  pandaDocTemplate: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  document: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  documentVersion: {
    create: jest.fn(),
  },
};

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getDocumentTypes includes active form definitions and panda templates', async () => {
    prismaMock.documentType.findMany.mockResolvedValue([{ id: 'type-1' }]);

    const result = await service.getDocumentTypes();

    expect(prismaMock.documentType.findMany).toHaveBeenCalledWith({
      include: {
        formDefinitions: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        pandaTemplates: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([{ id: 'type-1' }]);
  });

  it('updateDraftDocument rejects documents outside DRAFT status', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      status: DocumentStatus.SENT,
      versions: [],
      data: {
        dataJson: {},
      },
    });

    await expect(
      service.updateDraftDocument('user-1', 'doc-1', {
        contractDate: '2026-03-20',
        dataJson: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendDraftDocument no longer counts billing on SENT', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      status: DocumentStatus.DRAFT,
      companyProfile: {
        id: 'company-1',
        isUnlimited: false,
        monthlyDocLimit: 1,
      },
    });
    prismaMock.document.count.mockResolvedValue(1);
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-1',
      status: DocumentStatus.SENT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
      pandadocDocumentId: 'pd-123',
    });

    const result = await service.sendDraftDocument('user-1', 'doc-1');

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({
        status: DocumentStatus.SENT,
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
      }),
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });
    expect(result.isOverage).toBe(false);
    expect(result.document.status).toBe(DocumentStatus.SENT);
  });

  it('simulateDocumentViewed starts billing count and marks overage when limit is reached', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-2',
      status: DocumentStatus.SENT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
      companyProfile: {
        id: 'company-1',
        isUnlimited: false,
        monthlyDocLimit: 1,
      },
    });
    prismaMock.document.count.mockResolvedValue(1);
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-2',
      status: DocumentStatus.VIEWED,
      countedInBilling: true,
      isOverage: true,
      billingPeriod: '2026-03',
    });

    const result = await service.simulateDocumentViewed('user-1', 'doc-2');

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-2' },
      data: expect.objectContaining({
        status: DocumentStatus.VIEWED,
        countedInBilling: true,
        isOverage: true,
        billingPeriod: expect.any(String),
      }),
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });
    expect(result.document.status).toBe(DocumentStatus.VIEWED);
  });

  it('reactivateDocument resets send and billing fields back to draft defaults', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-3',
      status: DocumentStatus.CANCELLED,
      versions: [{ versionNumber: 1 }],
      data: {
        dataJson: { owner_name: 'Jane Doe' },
      },
    });
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-3',
      status: DocumentStatus.DRAFT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
      pandadocDocumentId: null,
    });

    const result = await service.reactivateDocument('user-1', 'doc-3');

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-3' },
      data: {
        status: DocumentStatus.DRAFT,
        cancelledAt: null,
        sentAt: null,
        viewedAt: null,
        signedAt: null,
        completedAt: null,
        pandadocDocumentId: null,
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
      },
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });
    expect(prismaMock.documentVersion.create).toHaveBeenCalledWith({
      data: {
        documentId: 'doc-3',
        versionNumber: 2,
        snapshotJson: { owner_name: 'Jane Doe' },
        changedByUserId: 'user-1',
      },
    });
    expect(result.document.status).toBe(DocumentStatus.DRAFT);
  });

  it('simulateDocumentSigned accepts VIEWED documents and preserves viewedAt when present', async () => {
    const viewedAt = new Date('2026-03-19T10:00:00.000Z');

    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-4',
      status: DocumentStatus.VIEWED,
      viewedAt,
      countedInBilling: true,
      isOverage: false,
      billingPeriod: '2026-03',
      companyProfile: {
        id: 'company-1',
        isUnlimited: false,
        monthlyDocLimit: 5,
      },
    });
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-4',
      status: DocumentStatus.SIGNED,
      viewedAt,
    });

    const result = await service.simulateDocumentSigned('user-1', 'doc-4');

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-4' },
      data: expect.objectContaining({
        status: DocumentStatus.SIGNED,
        viewedAt,
        signedAt: expect.any(Date),
      }),
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });
    expect(result.document.status).toBe(DocumentStatus.SIGNED);
  });

  it('cancelDocument accepts VIEWED documents', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-5',
      status: DocumentStatus.VIEWED,
    });
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-5',
      status: DocumentStatus.CANCELLED,
    });

    const result = await service.cancelDocument('user-1', 'doc-5');

    expect(result.document.status).toBe(DocumentStatus.CANCELLED);
  });
});
