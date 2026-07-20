import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { SignatureProviderService } from '../signature-provider/signature-provider.service';
import { EmailService } from '../email/email.service';
import { R2Service } from '../storage/r2.service';

// Mirror of documentDetailInclude in documents.service.ts — the shared shape
// every document.update/create returns (the source const isn't exported, so we
// keep a copy here for the detail-include assertions to track the real shape).
const DOCUMENT_DETAIL_INCLUDE = {
  documentType: true,
  formDefinition: true,
  signatureTemplate: true,
  data: true,
  customer: true,
  companyProfile: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  supersedes: { select: { id: true, documentNumber: true } },
  supersededBy: { select: { id: true, documentNumber: true } },
};

const prismaMock = {
  documentType: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  formDefinition: {
    findUnique: jest.fn(),
  },
  signatureTemplate: {
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
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  documentVersion: {
    create: jest.fn(),
  },
  userDocumentConfig: {
    findMany: jest.fn(),
  },
  receiptTemplate: {
    findMany: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
  },
  // Correlativo numbering now runs through an atomic per-(user, type) sequence
  // inside a transaction (migration 20260706150000), replacing the old
  // document.findMany max-scan.
  userDocumentSequence: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
};

const signatureProviderServiceMock = {
  createDocumentFromTemplate: jest.fn(),
  getDocumentStatus: jest.fn(),
  waitForDocumentDraft: jest.fn(),
  sendDocument: jest.fn(),
  resendDocument: jest.fn(),
  downloadDocumentPdf: jest.fn(),
};

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(signatureProviderServiceMock).forEach((mockFn) =>
      mockFn.mockReset(),
    );
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'SUPERADMIN',
      companyProfileId: 'company-1',
    });
    // Model C — default tenant allows contracts unless a test overrides it.
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      contractsEnabled: true,
    });
    // Numbering: $transaction runs its callback with the mock itself as the tx
    // client, so tx.userDocumentSequence.upsert resolves to the mocked fn. Default
    // sequence → lastNumber 1 (first doc for that user/type); tests override it.
    prismaMock.$transaction.mockImplementation(
      (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
    );
    prismaMock.userDocumentSequence.upsert.mockResolvedValue({ lastNumber: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: SignatureProviderService,
          useValue: signatureProviderServiceMock,
        },
        {
          provide: EmailService,
          useValue: {
            sendSigningInvitation: jest
              .fn()
              .mockResolvedValue({ id: 'test-email-id' }),
            sendSignedConfirmation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: R2Service,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(false),
            getObject: jest.fn(),
            putObject: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getDocumentTypes (asUserId) borrows a cross-tenant target user’s receipt template', async () => {
    // caller = SUPERADMIN (company-1); target = USER in a DIFFERENT tenant (company-2).
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        role: 'SUPERADMIN',
        companyProfileId: 'company-1',
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        role: 'USER',
        companyProfileId: 'company-2',
      });
    prismaMock.userDocumentConfig.findMany.mockResolvedValue([]);
    prismaMock.receiptTemplate.findMany.mockResolvedValue([
      { id: 'rt-borrow' },
    ]);
    prismaMock.documentType.findMany.mockResolvedValue([
      {
        id: 'dt-rec',
        name: 'Receipt',
        code: 'PAYMENT_RECEIPT',
        generationMode: 'DIRECT_PDF',
        formDefinitions: [{ id: 'f1', name: 'Form', schemaJson: {} }],
      },
    ]);

    const result = await service.getDocumentTypes('user-1', 'user-2');

    // Target resolved WITHOUT a same-tenant constraint (cross-tenant for SUPERADMIN).
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      select: { id: true, role: true, companyProfileId: true },
    });
    // Receipt template fetched for the TARGET's tenant and exposed for borrowing.
    expect(prismaMock.receiptTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyProfileId: 'company-2' }),
      }),
    );
    const receipt = result.find((t) => t.code === 'PAYMENT_RECEIPT') as
      | { receiptTemplateId?: string }
      | undefined;
    expect(receipt?.receiptTemplateId).toBe('rt-borrow');
  });

  it('getDocumentTypes includes active form definitions and signature templates', async () => {
    prismaMock.documentType.findMany.mockResolvedValue([
      { id: 'type-1', signatureTemplates: [{ id: 'tpl-1' }] },
    ]);

    const result = await service.getDocumentTypes('user-1');

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
        signatureTemplates: {
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
    expect(result).toEqual([
      {
        id: 'type-1',
        signatureTemplates: [{ id: 'tpl-1' }],
      },
    ]);
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
      userId: 'user-1',
      companyProfileId: 'company-1',
      documentNumber: 'CON-000001',
      status: DocumentStatus.DRAFT,
      lastSentRecipientEmail: null,
      data: {
        dataJson: {
          customer_email: 'client@example.com',
          customer_name: 'Jane Doe',
        },
      },
      user: {
        email: 'owner@ntssign.test',
        role: 'SUPERADMIN',
      },
      documentType: {
        name: 'Contract',
        code: 'CON',
      },
      formDefinition: {
        id: 'form-1',
      },
      signatureTemplate: {
        providerTemplateId: 'tpl-1',
        recipientRole: 'Client',
        tokenMappingJson: null,
        fieldMappingJson: null,
        sendSubjectTemplate: null,
        sendMessageTemplate: null,
      },
      versions: [],
      companyProfile: {
        id: 'company-1',
        companyName: 'Noa Company',
        legalName: null,
        email: 'office@noa.test',
        phone: null,
        website: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        licenseNumber: null,
        contactFirstName: null,
        contactLastName: null,
        contactTitle: null,
        contactEmail: null,
        contactPhone: null,
        contactAddressLine1: null,
        contactAddressLine2: null,
        contactCity: null,
        contactState: null,
        contactZipCode: null,
        contactCountry: null,
        isUnlimited: false,
        monthlyDocLimit: 1,
      },
    });
    signatureProviderServiceMock.createDocumentFromTemplate.mockResolvedValue({
      id: 'pd-123',
      status: 'document.uploaded',
    });
    signatureProviderServiceMock.waitForDocumentDraft.mockResolvedValue({
      id: 'pd-123',
      status: 'document.draft',
    });
    signatureProviderServiceMock.sendDocument.mockResolvedValue(undefined);
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-1',
      status: DocumentStatus.SENT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
      providerDocumentId: 'pd-123',
    });

    const result = await service.sendDraftDocument('user-1', 'doc-1');

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({
        status: DocumentStatus.SENT,
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
        lastSentRecipientEmail: 'client@example.com',
        providerStatus: 'document.sent',
      }),
      include: DOCUMENT_DETAIL_INCLUDE,
    });
    expect(result.isOverage).toBe(false);
    expect(result.document.status).toBe(DocumentStatus.SENT);
  });

  it('sendDraftDocument blocks draft resend bypass while cooldown is active', async () => {
    const lastManualReminderAt = new Date();

    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-cooldown',
      userId: 'user-1',
      companyProfileId: 'company-1',
      documentNumber: 'CON-COOLDOWN',
      status: DocumentStatus.DRAFT,
      lastManualReminderAt,
      lastSentRecipientEmail: 'client@example.com',
      data: {
        dataJson: {
          customer_email: 'client@example.com',
          customer_name: 'Jane Doe',
        },
      },
      user: {
        email: 'owner@ntssign.test',
        role: 'SUPERADMIN',
      },
      documentType: {
        name: 'Contract',
        code: 'CON',
      },
      formDefinition: {
        id: 'form-1',
      },
      signatureTemplate: {
        providerTemplateId: 'tpl-1',
        recipientRole: 'Client',
        tokenMappingJson: null,
        fieldMappingJson: null,
        sendSubjectTemplate: null,
        sendMessageTemplate: null,
      },
      versions: [],
      companyProfile: {
        id: 'company-1',
        companyName: 'Noa Company',
        legalName: null,
        email: 'office@noa.test',
        phone: null,
        website: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        licenseNumber: null,
        contactFirstName: null,
        contactLastName: null,
        contactTitle: null,
        contactEmail: null,
        contactPhone: null,
        contactAddressLine1: null,
        contactAddressLine2: null,
        contactCity: null,
        contactState: null,
        contactZipCode: null,
        contactCountry: null,
        isUnlimited: false,
        monthlyDocLimit: 1,
      },
    });

    await expect(
      service.sendDraftDocument('user-1', 'doc-cooldown'),
    ).rejects.toThrow(BadRequestException);

    expect(
      signatureProviderServiceMock.createDocumentFromTemplate,
    ).not.toHaveBeenCalled();
    expect(signatureProviderServiceMock.sendDocument).not.toHaveBeenCalled();
  });

  it('sendDraftDocument allows immediate resend after reactivation when customer email changes', async () => {
    const lastManualReminderAt = new Date();

    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-cooldown-changed-email',
      userId: 'user-1',
      companyProfileId: 'company-1',
      documentNumber: 'CON-COOLDOWN-EMAIL',
      status: DocumentStatus.DRAFT,
      lastManualReminderAt,
      lastSentRecipientEmail: 'wrong@example.com',
      data: {
        dataJson: {
          customer_email: 'correct@example.com',
          customer_name: 'Jane Doe',
        },
      },
      user: {
        email: 'owner@ntssign.test',
        role: 'SUPERADMIN',
      },
      documentType: {
        name: 'Contract',
        code: 'CON',
      },
      formDefinition: {
        id: 'form-1',
      },
      signatureTemplate: {
        providerTemplateId: 'tpl-1',
        recipientRole: 'Client',
        tokenMappingJson: null,
        fieldMappingJson: null,
        sendSubjectTemplate: null,
        sendMessageTemplate: null,
      },
      versions: [],
      companyProfile: {
        id: 'company-1',
        companyName: 'Noa Company',
        legalName: null,
        email: 'office@noa.test',
        phone: null,
        website: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        licenseNumber: null,
        contactFirstName: null,
        contactLastName: null,
        contactTitle: null,
        contactEmail: null,
        contactPhone: null,
        contactAddressLine1: null,
        contactAddressLine2: null,
        contactCity: null,
        contactState: null,
        contactZipCode: null,
        contactCountry: null,
        isUnlimited: false,
        monthlyDocLimit: 1,
      },
    });
    signatureProviderServiceMock.createDocumentFromTemplate.mockResolvedValue({
      id: 'pd-456',
      status: 'document.uploaded',
    });
    signatureProviderServiceMock.waitForDocumentDraft.mockResolvedValue({
      id: 'pd-456',
      status: 'document.draft',
    });
    signatureProviderServiceMock.sendDocument.mockResolvedValue(undefined);
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-cooldown-changed-email',
      status: DocumentStatus.SENT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
      providerDocumentId: 'pd-456',
      lastSentRecipientEmail: 'correct@example.com',
    });

    const result = await service.sendDraftDocument(
      'user-1',
      'doc-cooldown-changed-email',
    );

    expect(
      signatureProviderServiceMock.createDocumentFromTemplate,
    ).toHaveBeenCalled();
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
      include: DOCUMENT_DETAIL_INCLUDE,
    });
    expect(result.document.status).toBe(DocumentStatus.VIEWED);
  });

  it('reactivateDocument resets send and billing fields back to draft defaults while preserving reminder cooldown', async () => {
    const lastManualReminderAt = new Date('2026-03-30T12:00:00.000Z');
    const lastSentRecipientEmail = 'client@example.com';

    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-3',
      status: DocumentStatus.CANCELLED,
      lastManualReminderAt,
      lastSentRecipientEmail,
      versions: [{ versionNumber: 1 }],
      data: {
        dataJson: { owner_name: 'Jane Doe' },
      },
    });
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-3',
      status: DocumentStatus.DRAFT,
      lastManualReminderAt,
      lastSentRecipientEmail,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
      providerDocumentId: null,
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
        providerDocumentId: null,
        providerStatus: null,
        providerLastSyncedAt: null,
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
      },
      include: DOCUMENT_DETAIL_INCLUDE,
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
    expect(result.document.lastManualReminderAt).toEqual(lastManualReminderAt);
    expect(result.document.lastSentRecipientEmail).toBe(lastSentRecipientEmail);
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
      include: DOCUMENT_DETAIL_INCLUDE,
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

  it('cancelDocument accepts DRAFT documents', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-draft-cancel',
      status: DocumentStatus.DRAFT,
    });
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-draft-cancel',
      status: DocumentStatus.CANCELLED,
    });

    const result = await service.cancelDocument('user-1', 'doc-draft-cancel');

    expect(result.document.status).toBe(DocumentStatus.CANCELLED);
  });

  it('cancelDocument rejects SIGNED documents', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-signed',
      status: DocumentStatus.SIGNED,
    });

    await expect(
      service.cancelDocument('user-1', 'doc-signed'),
    ).rejects.toThrow(BadRequestException);
  });

  it('cancelDocument rejects COMPLETED documents', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-completed',
      status: DocumentStatus.COMPLETED,
    });

    await expect(
      service.cancelDocument('user-1', 'doc-completed'),
    ).rejects.toThrow(BadRequestException);
  });

  it('createDraftDocument creates document and first version with correct numbering', async () => {
    prismaMock.documentType.findUnique.mockResolvedValue({
      id: 'type-1',
      code: 'CON',
      name: 'Contract',
    });
    prismaMock.formDefinition.findUnique.mockResolvedValue({
      id: 'form-1',
      documentTypeId: 'type-1',
    });
    prismaMock.signatureTemplate.findUnique.mockResolvedValue({
      id: 'tpl-1',
      documentTypeId: 'type-1',
    });
    prismaMock.document.findFirst.mockResolvedValue(null);
    // First doc for (user-1, type-1) → the per-user sequence starts at 1.
    prismaMock.userDocumentSequence.upsert.mockResolvedValue({ lastNumber: 1 });
    prismaMock.document.create.mockResolvedValue({
      id: 'doc-new',
      documentNumber: 'CON-000001',
      status: DocumentStatus.DRAFT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
    });
    prismaMock.documentVersion.create.mockResolvedValue({});

    const result = await service.createDraftDocument('user-1', {
      documentTypeId: 'type-1',
      formDefinitionId: 'form-1',
      signatureTemplateId: 'tpl-1',
      contractDate: '2026-04-01',
      dataJson: { customer_name: 'Jane Doe' },
    });

    expect(prismaMock.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentNumber: 'CON-000001',
          status: DocumentStatus.DRAFT,
          countedInBilling: false,
          isOverage: false,
        }),
      }),
    );
    expect(prismaMock.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 1,
          documentId: 'doc-new',
          changedByUserId: 'user-1',
        }),
      }),
    );
    expect(result.document.documentNumber).toBe('CON-000001');
  });

  it('createDraftDocument rejects when formDefinition belongs to a different documentType', async () => {
    prismaMock.documentType.findUnique.mockResolvedValue({
      id: 'type-1',
      code: 'CON',
      name: 'Contract',
    });
    prismaMock.formDefinition.findUnique.mockResolvedValue({
      id: 'form-other',
      documentTypeId: 'type-OTHER',
    });
    prismaMock.signatureTemplate.findUnique.mockResolvedValue({
      id: 'tpl-1',
      documentTypeId: 'type-1',
    });
    prismaMock.document.findFirst.mockResolvedValue(null);

    await expect(
      service.createDraftDocument('user-1', {
        documentTypeId: 'type-1',
        formDefinitionId: 'form-other',
        signatureTemplateId: 'tpl-1',
        contractDate: '2026-04-01',
        dataJson: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('createDraftDocument scopes the correlativo per user', async () => {
    prismaMock.documentType.findUnique.mockResolvedValue({
      id: 'type-1',
      code: 'CON',
      name: 'Contract',
    });
    prismaMock.formDefinition.findUnique.mockResolvedValue({
      id: 'form-1',
      documentTypeId: 'type-1',
    });
    prismaMock.signatureTemplate.findUnique.mockResolvedValue({
      id: 'tpl-1',
      documentTypeId: 'type-1',
    });
    // This user's sequence is already at 2 → the atomic increment returns 3, so
    // the next number is CON-000003 for this user.
    prismaMock.userDocumentSequence.upsert.mockResolvedValue({ lastNumber: 3 });
    prismaMock.document.findFirst.mockResolvedValue(null);
    prismaMock.document.create.mockResolvedValue({
      id: 'doc-new',
      documentNumber: 'CON-000003',
      status: DocumentStatus.DRAFT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
    });
    prismaMock.documentVersion.create.mockResolvedValue({});

    await service.createDraftDocument('user-1', {
      documentTypeId: 'type-1',
      formDefinitionId: 'form-1',
      signatureTemplateId: 'tpl-1',
      contractDate: '2026-04-01',
      dataJson: {},
    });

    // The correlativo comes from the per-(user, type) sequence, scoped to the
    // creator's userId (not the tenant) via the composite unique key.
    expect(prismaMock.userDocumentSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_documentTypeId: { userId: 'user-1', documentTypeId: 'type-1' },
        },
      }),
    );
    expect(prismaMock.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentNumber: 'CON-000003' }),
      }),
    );
  });

  it('createDraftDocument: a master using another user’s global form gets a number from their OWN sequence', async () => {
    // The bug case: a master creates with a global form owned by another user.
    // No guard blocks it, and the number must come from the master's own
    // sequence — not the form owner's. The master (user-1) has no docs yet, so
    // the next number is CON-000001 regardless of how many the form owner has.
    prismaMock.documentType.findUnique.mockResolvedValue({
      id: 'type-1',
      code: 'CON',
      name: 'Contract',
    });
    prismaMock.formDefinition.findUnique.mockResolvedValue({
      id: 'form-owned-by-someone-else',
      documentTypeId: 'type-1',
    });
    prismaMock.signatureTemplate.findUnique.mockResolvedValue({
      id: 'tpl-owned-by-someone-else',
      documentTypeId: 'type-1',
    });
    // Master (user-1) owns no CON docs → their own sequence starts at 1.
    prismaMock.userDocumentSequence.upsert.mockResolvedValue({ lastNumber: 1 });
    prismaMock.document.findFirst.mockResolvedValue(null);
    prismaMock.document.create.mockResolvedValue({
      id: 'doc-new',
      documentNumber: 'CON-000001',
      status: DocumentStatus.DRAFT,
      countedInBilling: false,
      isOverage: false,
      billingPeriod: null,
    });
    prismaMock.documentVersion.create.mockResolvedValue({});

    const result = await service.createDraftDocument('user-1', {
      documentTypeId: 'type-1',
      formDefinitionId: 'form-owned-by-someone-else',
      signatureTemplateId: 'tpl-owned-by-someone-else',
      contractDate: '2026-04-01',
      dataJson: {},
    });

    // Number drawn from the master's OWN sequence (user-1) — NOT a guard
    // rejection, NOT the form owner's sequence.
    expect(prismaMock.userDocumentSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_documentTypeId: { userId: 'user-1', documentTypeId: 'type-1' },
        },
      }),
    );
    expect(result.document.documentNumber).toBe('CON-000001');
  });

  it('resendDocument blocks resend when cooldown is active', async () => {
    const lastManualReminderAt = new Date();

    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-resend-cooldown',
      status: DocumentStatus.SENT,
      providerDocumentId: 'pd-resend',
      lastManualReminderAt,
      data: { dataJson: { customer_email: 'client@example.com' } },
    });
    signatureProviderServiceMock.getDocumentStatus.mockResolvedValue({
      id: 'pd-resend',
      status: 'document.sent',
    });
    prismaMock.document.findUnique.mockResolvedValue({
      id: 'doc-resend-cooldown',
      status: DocumentStatus.SENT,
      sentAt: new Date(),
      companyProfile: null,
    });
    prismaMock.document.update.mockResolvedValue({});

    await expect(
      service.resendDocument('user-1', 'doc-resend-cooldown'),
    ).rejects.toThrow(BadRequestException);

    expect(signatureProviderServiceMock.resendDocument).not.toHaveBeenCalled();
  });

  it('resendDocument rejects documents that are not SENT or VIEWED', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-draft',
      status: DocumentStatus.DRAFT,
      providerDocumentId: 'pd-draft',
      data: { dataJson: {} },
    });

    await expect(service.resendDocument('user-1', 'doc-draft')).rejects.toThrow(
      BadRequestException,
    );

    expect(
      signatureProviderServiceMock.getDocumentStatus,
    ).not.toHaveBeenCalled();
  });

  it('simulateDocumentCompleted marks SIGNED document as completed with billing preserved', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-6',
      status: DocumentStatus.SIGNED,
      countedInBilling: true,
      isOverage: false,
      billingPeriod: '2026-04',
      companyProfile: {
        id: 'company-1',
        isUnlimited: false,
        monthlyDocLimit: 5,
      },
    });
    prismaMock.document.update.mockResolvedValue({
      id: 'doc-6',
      status: DocumentStatus.COMPLETED,
      countedInBilling: true,
      isOverage: false,
      billingPeriod: '2026-04',
    });

    const result = await service.simulateDocumentCompleted('user-1', 'doc-6');

    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-6' },
      data: expect.objectContaining({
        status: DocumentStatus.COMPLETED,
        countedInBilling: true,
        completedAt: expect.any(Date),
      }),
      include: expect.any(Object),
    });
    expect(result.document.status).toBe(DocumentStatus.COMPLETED);
  });

  it('simulateDocumentCompleted rejects non-SIGNED documents', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-viewed',
      status: DocumentStatus.VIEWED,
      companyProfile: {
        id: 'company-1',
        isUnlimited: false,
        monthlyDocLimit: 5,
      },
    });

    await expect(
      service.simulateDocumentCompleted('user-1', 'doc-viewed'),
    ).rejects.toThrow(BadRequestException);
  });

  // ── B7: soft-delete of documents ──────────────────────────────────────────
  // A DRAFT is deleted (soft), never voided. Void stays for issued (SENT) docs.
  // A deleted doc disappears for the owner; a SUPERADMIN still sees it.
  describe('deleteDocument (B7 soft-delete)', () => {
    it('soft-deletes a DRAFT by stamping deletedAt, scoped to the owner', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        companyProfileId: 'company-1',
      });
      prismaMock.document.findFirst.mockResolvedValue({
        id: 'doc-del',
        status: DocumentStatus.DRAFT,
      });
      prismaMock.document.update.mockResolvedValue({ id: 'doc-del' });

      await service.deleteDocument('user-1', 'doc-del');

      // Normal user is scoped to their own, not-already-deleted docs.
      expect(prismaMock.document.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc-del', userId: 'user-1', deletedAt: null },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-del' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('rejects deleting a non-DRAFT document (issued docs are voided, not deleted)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        companyProfileId: 'company-1',
      });
      prismaMock.document.findFirst.mockResolvedValue({
        id: 'doc-sent',
        status: DocumentStatus.SENT,
      });

      await expect(
        service.deleteDocument('user-1', 'doc-sent'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.document.update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the doc is out of scope or already deleted', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        companyProfileId: 'company-1',
      });
      prismaMock.document.findFirst.mockResolvedValue(null);

      await expect(service.deleteDocument('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyDocuments soft-delete visibility (B7)', () => {
    it('hides soft-deleted docs from a normal user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        companyProfileId: 'company-1',
      });
      prismaMock.document.findMany.mockResolvedValue([]);

      await service.getMyDocuments('user-1');

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', deletedAt: null },
        }),
      );
    });

    it('shows every doc (incl. deleted) to a SUPERADMIN across the tenant', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'SUPERADMIN',
        companyProfileId: 'company-1',
      });
      prismaMock.document.findMany.mockResolvedValue([]);

      await service.getMyDocuments('user-1');

      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyProfileId: 'company-1' },
        }),
      );
    });
  });
});
