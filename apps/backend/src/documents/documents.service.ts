import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SignatureProviderService } from '../signature-provider/signature-provider.service';
import { CreateDraftDocumentDto } from './dto/create-draft-document.dto';
import { UpdateDraftDocumentDto } from './dto/update-draft-document.dto';

type ScalarValue = string | number | boolean;

type MappingDefinition =
  | string
  | {
      path?: string;
      role?: string;
    };

type LoadedDocument = Prisma.DocumentGetPayload<{
  include: {
    companyProfile: true;
    user: true;
    documentType: true;
    formDefinition: true;
    signatureTemplate: true;
    data: true;
    versions: true;
  };
}>;

type PublicDocument = Prisma.DocumentGetPayload<{
  include: {
    companyProfile: true;
    user: true;
    documentType: true;
    formDefinition: true;
    signatureTemplate: true;
    data: true;
  };
}>;

type PublicSignatureTokenPayload = {
  v: 1;
  p: 'signature-complete';
  documentId: string;
  exp: number;
};

const documentDetailInclude = {
  documentType: true,
  formDefinition: true,
  signatureTemplate: true,
  data: true,
} satisfies Prisma.DocumentInclude;

const publicDocumentInclude = {
  companyProfile: true,
  user: true,
  documentType: true,
  formDefinition: true,
  signatureTemplate: true,
  data: true,
} satisfies Prisma.DocumentInclude;

const PUBLIC_SIGNATURE_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const MANUAL_REMINDER_COOLDOWN_MS = 1000 * 60 * 60 * 24;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignatureProviderService))
    private readonly signatureProviderService: SignatureProviderService,
  ) {}

  private getCurrentBillingPeriod(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private resolveSignatureTemplateId(body: CreateDraftDocumentDto) {
    const templateId = body.signatureTemplateId;

    if (!templateId) {
      throw new BadRequestException('Signature template is required');
    }

    return templateId;
  }

  private serializeDocumentType<
    T extends { signatureTemplates?: unknown[] | null },
  >(documentType: T) {
    return {
      ...documentType,
      signatureTemplates: documentType.signatureTemplates ?? [],
    };
  }

  private serializeDocument<T extends Record<string, any> | null>(document: T) {
    if (!document) {
      return document;
    }

    const now = new Date();
    const sendAvailableAt = this.getDraftSendAvailableAt(document, now);
    const sendAvailableInSeconds = sendAvailableAt
      ? Math.max(
          0,
          Math.ceil((sendAvailableAt.getTime() - now.getTime()) / 1000),
        )
      : 0;
    const resendAvailableAt = this.getResendAvailableAt(
      document.lastManualReminderAt ?? null,
    );
    const resendAvailableInSeconds = resendAvailableAt
      ? Math.max(
          0,
          Math.ceil((resendAvailableAt.getTime() - now.getTime()) / 1000),
        )
      : 0;
    const canResend =
      this.isResendEligibleStatus(document.status) &&
      resendAvailableInSeconds === 0;

    return {
      ...document,
      providerDocumentId: document.providerDocumentId ?? null,
      providerStatus: document.providerStatus ?? null,
      providerLastSyncedAt: document.providerLastSyncedAt ?? null,
      lastManualReminderAt: document.lastManualReminderAt ?? null,
      lastSentRecipientEmail: document.lastSentRecipientEmail ?? null,
      sendAvailableAt: sendAvailableAt?.toISOString() ?? null,
      sendAvailableInSeconds,
      canSend: this.canSendDraftDocument(document, now),
      resendAvailableAt: resendAvailableAt?.toISOString() ?? null,
      resendAvailableInSeconds,
      serverNow: now.toISOString(),
      canResend,
      signatureTemplate: document.signatureTemplate
        ? {
            ...document.signatureTemplate,
            providerTemplateId:
              document.signatureTemplate.providerTemplateId ?? null,
          }
        : null,
    };
  }

  private async getDocumentAccessScope(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        companyProfileId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.companyProfileId) {
      throw new BadRequestException('User does not have a company profile');
    }

    return user.role === 'MASTER'
      ? { companyProfileId: user.companyProfileId }
      : { userId: user.id };
  }

  private isResendEligibleStatus(status?: string | null) {
    return status === DocumentStatus.SENT || status === DocumentStatus.VIEWED;
  }

  private getResendAvailableAt(lastManualReminderAt?: Date | string | null) {
    if (!lastManualReminderAt) {
      return null;
    }

    const reminderDate =
      lastManualReminderAt instanceof Date
        ? lastManualReminderAt
        : new Date(lastManualReminderAt);

    if (Number.isNaN(reminderDate.getTime())) {
      return null;
    }

    return new Date(reminderDate.getTime() + MANUAL_REMINDER_COOLDOWN_MS);
  }

  private getResendCooldownRemainingMs(
    document: { lastManualReminderAt?: Date | string | null },
    now = new Date(),
  ) {
    const resendAvailableAt = this.getResendAvailableAt(
      document.lastManualReminderAt ?? null,
    );

    if (!resendAvailableAt) {
      return 0;
    }

    return Math.max(0, resendAvailableAt.getTime() - now.getTime());
  }

  private normalizeEmail(value?: string | null) {
    const normalized = value?.trim().toLowerCase() ?? '';
    return normalized.length > 0 ? normalized : null;
  }

  private getCurrentRecipientEmail(document: {
    data?: { dataJson?: Prisma.JsonValue | null } | null;
  }) {
    const data = this.normalizeJsonObject(document.data?.dataJson);
    return this.normalizeEmail(
      this.firstNonEmptyString(
        this.readScalarString(data.customer_email),
        this.readScalarString(data.client_email),
      ),
    );
  }

  private shouldBlockDraftSendForRecipientReuse(
    document: {
      status?: DocumentStatus | string | null;
      lastManualReminderAt?: Date | string | null;
      lastSentRecipientEmail?: string | null;
      data?: { dataJson?: Prisma.JsonValue | null } | null;
    },
    now = new Date(),
  ) {
    if (document.status !== DocumentStatus.DRAFT) {
      return false;
    }

    const cooldownRemainingMs = this.getResendCooldownRemainingMs(
      document,
      now,
    );
    if (cooldownRemainingMs <= 0) {
      return false;
    }

    const currentRecipientEmail = this.getCurrentRecipientEmail(document);
    const previousRecipientEmail = this.normalizeEmail(
      document.lastSentRecipientEmail ?? null,
    );

    if (!currentRecipientEmail || !previousRecipientEmail) {
      return false;
    }

    return currentRecipientEmail === previousRecipientEmail;
  }

  private getDraftSendAvailableAt(
    document: {
      status?: DocumentStatus | string | null;
      lastManualReminderAt?: Date | string | null;
      lastSentRecipientEmail?: string | null;
      data?: { dataJson?: Prisma.JsonValue | null } | null;
    },
    now = new Date(),
  ) {
    if (!this.shouldBlockDraftSendForRecipientReuse(document, now)) {
      return null;
    }

    return this.getResendAvailableAt(document.lastManualReminderAt ?? null);
  }

  private canSendDraftDocument(
    document: {
      status?: DocumentStatus | string | null;
      lastManualReminderAt?: Date | string | null;
      lastSentRecipientEmail?: string | null;
      data?: { dataJson?: Prisma.JsonValue | null } | null;
    },
    now = new Date(),
  ) {
    if (document.status !== DocumentStatus.DRAFT) {
      return false;
    }

    return !this.shouldBlockDraftSendForRecipientReuse(document, now);
  }

  private formatCooldownRemaining(remainingMs: number) {
    const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  private getDocumentStatusRank(status?: DocumentStatus | null) {
    switch (status) {
      case DocumentStatus.DRAFT:
        return 0;
      case DocumentStatus.SENT:
        return 1;
      case DocumentStatus.VIEWED:
        return 2;
      case DocumentStatus.SIGNED:
        return 3;
      case DocumentStatus.COMPLETED:
        return 4;
      case DocumentStatus.CANCELLED:
        return 5;
      default:
        return -1;
    }
  }

  private getIncomingLifecycleRank(status: string) {
    switch (status) {
      case 'draft':
        return 0;
      case 'sent':
        return 1;
      case 'viewed':
        return 2;
      case 'signed':
        return 3;
      case 'completed':
        return 4;
      case 'cancelled':
        return 5;
      default:
        return -1;
    }
  }

  private shouldIgnoreLifecycleRegression(
    currentStatus: DocumentStatus,
    incomingStatus: string,
  ) {
    const incomingRank = this.getIncomingLifecycleRank(incomingStatus);
    if (incomingRank < 0) {
      return false;
    }

    const currentRank = this.getDocumentStatusRank(currentStatus);
    return currentRank > incomingRank;
  }

  private async getBillingState(
    companyId: string,
    isUnlimited: boolean,
    monthlyDocLimit: number,
  ) {
    const now = new Date();
    const billingPeriod = this.getCurrentBillingPeriod(now);

    const countedDocuments = await this.prisma.document.count({
      where: {
        companyProfileId: companyId,
        countedInBilling: true,
        billingPeriod,
      },
    });

    return {
      now,
      billingPeriod,
      isOverage: !isUnlimited && countedDocuments >= monthlyDocLimit,
    };
  }

  async getDocumentTypes() {
    const documentTypes = await this.prisma.documentType.findMany({
      include: {
        formDefinitions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        signatureTemplates: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return documentTypes.map((documentType) =>
      this.serializeDocumentType(documentType),
    );
  }

  private async generateDocumentNumber(
    documentTypeId: string,
  ): Promise<string> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    const latestDocument = await this.prisma.document.findFirst({
      where: { documentTypeId },
      select: { documentNumber: true },
      orderBy: { documentNumber: 'desc' },
    });

    const latestMatch = latestDocument?.documentNumber.match(/-(\d+)$/);
    const currentNumber = latestMatch ? Number(latestMatch[1]) : 0;
    const nextNumber = currentNumber + 1;
    return `${documentType.code}-${String(nextNumber).padStart(6, '0')}`;
  }

  async createDraftDocument(userId: string, body: CreateDraftDocumentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.companyProfileId) {
      throw new BadRequestException('User does not have a company profile');
    }

    const signatureTemplateId = this.resolveSignatureTemplateId(body);

    const [documentType, formDefinition, signatureTemplate] = await Promise.all(
      [
        this.prisma.documentType.findUnique({
          where: { id: body.documentTypeId },
        }),
        this.prisma.formDefinition.findUnique({
          where: { id: body.formDefinitionId },
        }),
        this.prisma.signatureTemplate.findUnique({
          where: { id: signatureTemplateId },
        }),
      ],
    );

    if (!documentType) throw new NotFoundException('Document type not found');
    if (!formDefinition)
      throw new NotFoundException('Form definition not found');
    if (!signatureTemplate) {
      throw new NotFoundException('Signature template not found');
    }
    if (formDefinition.documentTypeId !== body.documentTypeId) {
      throw new BadRequestException(
        'Form definition does not belong to the selected document type',
      );
    }
    if (signatureTemplate.documentTypeId !== body.documentTypeId) {
      throw new BadRequestException(
        'Signature template does not belong to the selected document type',
      );
    }

    const document = await this.prisma.document.create({
      data: {
        documentNumber: await this.generateDocumentNumber(body.documentTypeId),
        userId: user.id,
        companyProfileId: user.companyProfileId,
        documentTypeId: body.documentTypeId,
        formDefinitionId: body.formDefinitionId,
        signatureTemplateId,
        status: DocumentStatus.DRAFT,
        contractDate: new Date(body.contractDate),
        countedInBilling: false,
        isOverage: false,
        data: { create: { dataJson: body.dataJson } },
      },
      include: documentDetailInclude,
    });

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        snapshotJson: body.dataJson,
        changedByUserId: user.id,
      },
    });

    return {
      message: 'Draft document created successfully',
      document: this.serializeDocument(document),
    };
  }

  async getMyDocuments(userId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const documents = await this.prisma.document.findMany({
      where: scope,
      include: {
        user: true,
        companyProfile: true,
        documentType: true,
        formDefinition: true,
        data: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((document) => this.serializeDocument(document));
  }

  async getDocumentDetail(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: {
        ...documentDetailInclude,
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    return this.serializeDocument(document);
  }

  async getDocumentPublicLinks(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.providerDocumentId) {
      throw new BadRequestException(
        'Document is not linked to a signature provider',
      );
    }

    return this.buildPublicSignatureLinks(document.id);
  }

  async updateDraftDocument(
    userId: string,
    documentId: string,
    body: UpdateDraftDocumentDto,
  ) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: { data: true, versions: true },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be edited');
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        contractDate: new Date(body.contractDate),
        data: { update: { dataJson: body.dataJson } },
      },
      include: documentDetailInclude,
    });

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: document.versions.length + 1,
        snapshotJson: body.dataJson,
        changedByUserId: userId,
      },
    });

    return {
      message: 'Draft document updated successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async sendDraftDocument(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: {
        companyProfile: true,
        user: true,
        documentType: true,
        formDefinition: true,
        signatureTemplate: true,
        data: true,
        versions: true,
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be sent');
    }
    if (!document.companyProfile) {
      throw new BadRequestException('Company profile not found');
    }
    if (!document.signatureTemplate?.providerTemplateId) {
      throw new BadRequestException('Signature template is not configured');
    }

    const sendCooldownRemainingMs = this.getResendCooldownRemainingMs(document);
    if (this.shouldBlockDraftSendForRecipientReuse(document)) {
      throw new BadRequestException(
        `This document was recently resent to the same email address. Update the customer email or send again in ${this.formatCooldownRemaining(
          sendCooldownRemainingMs,
        )}.`,
      );
    }

    const context = this.buildMappingContext(document);
    const recipient = this.buildSignatureRecipient(document);
    const syncTimestamp = new Date();
    const subject = this.renderTextTemplate(
      document.signatureTemplate.sendSubjectTemplate,
      context,
      `Please review and sign ${document.documentNumber}`,
    );
    const message = this.renderTextTemplate(
      document.signatureTemplate.sendMessageTemplate,
      context,
      `Hello, please review and sign ${document.documentNumber} sent from NTSSign.`,
    );
    let providerDocumentId = document.providerDocumentId;
    let providerStatus = document.providerStatus;

    if (!providerDocumentId) {
      const senderRecipient = this.buildSenderSignatureRecipient(document);
      const fallbackFields = this.buildFallbackScalarMap(context);
      const { completionUrl } = this.buildPublicSignatureLinks(document.id);
      const createdDocument =
        await this.signatureProviderService.createDocumentFromTemplate({
          name: this.buildSignatureDocumentName(document),
          templateId: document.signatureTemplate.providerTemplateId,
          recipients: [recipient],
          senderRecipient,
          subject,
          message,
          tokens: this.buildMappedTokens(
            document.signatureTemplate.tokenMappingJson,
            context,
            fallbackFields,
          ),
          fields: this.buildMappedFields(
            document.signatureTemplate.fieldMappingJson,
            context,
            fallbackFields,
            recipient.role,
          ),
          metadata: {
            noasignDocumentId: document.id,
            noasignCompanyProfileId: document.companyProfileId ?? '',
            noasignUserId: document.userId,
            noasignDocumentNumber: document.documentNumber,
          },
          signerRedirectUrl: completionUrl,
        });

      providerDocumentId = createdDocument.id;
      providerStatus = createdDocument.status;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          providerDocumentId,
          providerStatus,
          providerLastSyncedAt: syncTimestamp,
        },
      });
    } else {
      const remoteStatus =
        await this.signatureProviderService.getDocumentStatus(
          providerDocumentId,
        );
      providerStatus = remoteStatus.status;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          providerStatus,
          providerLastSyncedAt: syncTimestamp,
        },
      });

      if (
        providerStatus &&
        !['document.uploaded', 'document.draft'].includes(providerStatus)
      ) {
        await this.syncDocumentFromProviderStatus(
          document.id,
          providerStatus,
          syncTimestamp,
        );
        throw new BadRequestException(
          'This draft is already linked to an active signature request',
        );
      }
    }

    if (!providerDocumentId) {
      throw new BadRequestException('Unable to resolve signature document ID');
    }

    if (providerStatus !== 'document.draft') {
      const readyStatus =
        await this.signatureProviderService.waitForDocumentDraft(
          providerDocumentId,
        );
      providerStatus = readyStatus.status;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          providerStatus,
          providerLastSyncedAt: new Date(),
        },
      });
    }

    await this.signatureProviderService.sendDocument(providerDocumentId, {
      subject,
      message,
    });

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.SENT,
        sentAt: new Date(),
        lastManualReminderAt: null,
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
        lastSentRecipientEmail: recipient.email,
        providerDocumentId,
        providerStatus: 'document.sent',
        providerLastSyncedAt: new Date(),
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Document sent successfully',
      isOverage: false,
      billingPeriod: null,
      document: this.serializeDocument(updatedDocument),
    };
  }

  async resendDocument(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: {
        documentType: true,
        data: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!this.isResendEligibleStatus(document.status)) {
      throw new BadRequestException(
        'Only sent or viewed documents can be resent',
      );
    }

    if (!document.providerDocumentId) {
      throw new BadRequestException(
        'Document is not linked to a signature request',
      );
    }

    const syncedAt = new Date();
    const remoteStatus = await this.signatureProviderService.getDocumentStatus(
      document.providerDocumentId,
    );

    await this.syncDocumentFromProviderStatus(
      document.id,
      remoteStatus.status,
      syncedAt,
    );

    const normalizedStatus = this.normalizeExternalStatus(remoteStatus.status);
    if (!['sent', 'viewed'].includes(normalizedStatus)) {
      throw new BadRequestException(
        'Only sent or viewed documents can be resent',
      );
    }

    const cooldownRemainingMs = this.getResendCooldownRemainingMs(
      document,
      syncedAt,
    );

    if (cooldownRemainingMs > 0) {
      throw new BadRequestException(
        `This document can be resent again in ${this.formatCooldownRemaining(
          cooldownRemainingMs,
        )}.`,
      );
    }

    await this.signatureProviderService.resendDocument(
      document.providerDocumentId,
      {
        message: `Friendly reminder from NTSsign: please review and sign ${document.documentNumber}.`,
      },
    );

    const reminderTimestamp = new Date();
    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        providerStatus: remoteStatus.status,
        providerLastSyncedAt: reminderTimestamp,
        lastManualReminderAt: reminderTimestamp,
        lastSentRecipientEmail: this.getCurrentRecipientEmail(document),
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Reminder sent successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async cancelDocument(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (
      document.status !== DocumentStatus.DRAFT &&
      document.status !== DocumentStatus.SENT &&
      document.status !== DocumentStatus.VIEWED
    ) {
      throw new BadRequestException(
        'Only draft, sent or viewed documents can be cancelled',
      );
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Document cancelled successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async reactivateDocument(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: { data: true, versions: true },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== DocumentStatus.CANCELLED) {
      throw new BadRequestException(
        'Only cancelled documents can be reactivated',
      );
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
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
      include: documentDetailInclude,
    });

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: document.versions.length + 1,
        snapshotJson: document.data?.dataJson || {},
        changedByUserId: userId,
      },
    });

    return {
      message: 'Document reactivated successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  private assertNotProduction() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'This endpoint is not available in production',
      );
    }
  }

  async simulateDocumentViewed(userId: string, documentId: string) {
    this.assertNotProduction();
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: { companyProfile: true },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== DocumentStatus.SENT) {
      throw new BadRequestException(
        'Only sent documents can be marked as viewed',
      );
    }
    if (!document.companyProfile) {
      throw new BadRequestException('Company profile not found');
    }

    const billingState = document.countedInBilling
      ? null
      : await this.getBillingState(
          document.companyProfile.id,
          document.companyProfile.isUnlimited,
          document.companyProfile.monthlyDocLimit,
        );

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.VIEWED,
        viewedAt: new Date(),
        countedInBilling: true,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Document marked as viewed successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async simulateDocumentSigned(userId: string, documentId: string) {
    this.assertNotProduction();
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: { companyProfile: true },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (
      document.status !== DocumentStatus.SENT &&
      document.status !== DocumentStatus.VIEWED
    ) {
      throw new BadRequestException(
        'Only sent or viewed documents can be marked as signed',
      );
    }
    if (!document.companyProfile) {
      throw new BadRequestException('Company profile not found');
    }

    const now = new Date();
    const billingState = document.countedInBilling
      ? null
      : await this.getBillingState(
          document.companyProfile.id,
          document.companyProfile.isUnlimited,
          document.companyProfile.monthlyDocLimit,
        );

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.SIGNED,
        viewedAt: document.viewedAt ?? now,
        signedAt: now,
        countedInBilling: true,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Document marked as signed successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async simulateDocumentCompleted(userId: string, documentId: string) {
    this.assertNotProduction();
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: { companyProfile: true },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== DocumentStatus.SIGNED) {
      throw new BadRequestException(
        'Only signed documents can be marked as completed',
      );
    }
    if (!document.companyProfile) {
      throw new BadRequestException('Company profile not found');
    }

    const billingState = document.countedInBilling
      ? null
      : await this.getBillingState(
          document.companyProfile.id,
          document.companyProfile.isUnlimited,
          document.companyProfile.monthlyDocLimit,
        );

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.COMPLETED,
        completedAt: new Date(),
        countedInBilling: true,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Document marked as completed successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async syncDocumentStatus(userId: string, documentId: string) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: documentDetailInclude,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.providerDocumentId) {
      throw new BadRequestException(
        'Document is not linked to a signature provider',
      );
    }

    const remoteStatus = await this.signatureProviderService.getDocumentStatus(
      document.providerDocumentId,
    );
    const syncedAt = new Date();

    await this.syncDocumentFromProviderStatus(
      document.id,
      remoteStatus.status,
      syncedAt,
    );

    const updatedDocument = await this.prisma.document.findUnique({
      where: { id: document.id },
      include: documentDetailInclude,
    });

    if (!updatedDocument) {
      throw new NotFoundException('Document not found after sync');
    }

    return {
      message: 'Document status synced successfully',
      document: this.serializeDocument(updatedDocument),
    };
  }

  async streamFinalPdf(userId: string, documentId: string, res: Response) {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
      include: documentDetailInclude,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.providerDocumentId) {
      throw new BadRequestException(
        'Document is not linked to a signature provider',
      );
    }

    const remoteStatus = await this.signatureProviderService.getDocumentStatus(
      document.providerDocumentId,
    );
    const syncedAt = new Date();

    await this.syncDocumentFromProviderStatus(
      document.id,
      remoteStatus.status,
      syncedAt,
    );

    const refreshedDocument = await this.prisma.document.findUnique({
      where: { id: document.id },
      select: {
        status: true,
        completedAt: true,
      },
    });

    if (
      refreshedDocument?.status !== DocumentStatus.COMPLETED &&
      !refreshedDocument?.completedAt
    ) {
      throw new BadRequestException(
        'Signed PDF is not available until the signature provider marks the document as completed',
      );
    }

    const pdf = await this.signatureProviderService.downloadDocumentPdf(
      document.providerDocumentId,
    );
    const safeFileName = `${document.documentNumber}.pdf`;

    res.setHeader('Content-Type', pdf.contentType ?? 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      pdf.contentDisposition ?? `attachment; filename="${safeFileName}"`,
    );
    res.send(pdf.buffer);
  }

  async getPublicSignatureCompletion(token: string, apiBaseUrl?: string) {
    const { document, expiresAt } =
      await this.loadPublicDocumentForToken(token);
    const previewUrl =
      document.status === DocumentStatus.COMPLETED
        ? `${this.normalizeBaseUrl(apiBaseUrl ?? this.getBackendUrl())}/public/signatures/${encodeURIComponent(token)}/preview`
        : null;
    const downloadUrl =
      document.status === DocumentStatus.COMPLETED
        ? `${this.normalizeBaseUrl(apiBaseUrl ?? this.getBackendUrl())}/public/signatures/${encodeURIComponent(token)}/download`
        : null;

    return {
      token,
      status: document.status.toLowerCase(),
      documentId: document.id,
      documentNumber: document.documentNumber,
      documentName: this.buildSignatureDocumentName(document),
      signerName: this.buildPublicSignerName(document),
      senderName: this.buildPublicSenderName(document),
      previewUrl,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async streamPublicFinalPdf(
    token: string,
    disposition: 'inline' | 'attachment',
    res: Response,
  ) {
    const { document } = await this.loadPublicDocumentForToken(token);

    if (!document.providerDocumentId) {
      throw new BadRequestException(
        'Document is not linked to a signature provider',
      );
    }

    if (document.status !== DocumentStatus.COMPLETED) {
      throw new BadRequestException(
        'Signed PDF is not available until the document is completed',
      );
    }

    const pdf = await this.signatureProviderService.downloadDocumentPdf(
      document.providerDocumentId,
    );
    const safeFileName = `${document.documentNumber}.pdf`;

    res.setHeader('Content-Type', pdf.contentType ?? 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${safeFileName}"`,
    );
    res.send(pdf.buffer);
  }

  async handleBoldSignWebhook(payload: unknown) {
    if (!this.isRecord(payload)) return;

    const eventType = this.readStringValue(payload, [
      'event.eventType',
      'eventType',
    ]);
    const providerDocumentId = this.readStringValue(payload, [
      'data.documentId',
      'documentId',
    ]);
    const noasignDocumentId = this.readStringValue(payload, [
      'data.metaData.noasignDocumentId',
      'metadata.noasignDocumentId',
    ]);
    const eventTime = this.readStringValue(payload, ['event.created']);
    const occurredAt =
      eventTime && /^\d+$/.test(eventTime)
        ? new Date(Number(eventTime) * 1000)
        : new Date();

    const document = noasignDocumentId
      ? await this.prisma.document.findUnique({
          where: { id: noasignDocumentId },
          include: { companyProfile: true },
        })
      : providerDocumentId
        ? await this.prisma.document.findFirst({
            where: { providerDocumentId },
            include: { companyProfile: true },
          })
        : null;

    if (!document || !eventType || eventType === 'Verification') return;

    await this.syncDocumentFromProviderStatus(
      document.id,
      eventType,
      occurredAt,
    );
  }

  private async syncDocumentFromProviderStatus(
    documentId: string,
    rawStatus: string,
    occurredAt: Date,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { companyProfile: true },
    });

    if (!document) return;

    const normalizedStatus = this.normalizeExternalStatus(rawStatus);

    if (
      this.shouldIgnoreLifecycleRegression(document.status, normalizedStatus)
    ) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          providerLastSyncedAt: occurredAt,
        },
      });
      return;
    }

    switch (normalizedStatus) {
      case 'draft':
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            providerStatus: rawStatus,
            providerLastSyncedAt: occurredAt,
          },
        });
        return;
      case 'sent':
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.SENT,
            sentAt: document.sentAt ?? occurredAt,
            providerStatus: rawStatus,
            providerLastSyncedAt: occurredAt,
          },
        });
        return;
      case 'viewed':
        await this.syncDocumentToViewed(document.id, occurredAt, rawStatus);
        return;
      case 'signed':
        await this.syncDocumentToSigned(document.id, occurredAt, rawStatus);
        return;
      case 'completed':
        await this.syncDocumentToCompleted(document.id, occurredAt, rawStatus);
        return;
      case 'cancelled':
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.CANCELLED,
            cancelledAt: document.cancelledAt ?? occurredAt,
            providerStatus: rawStatus,
            providerLastSyncedAt: occurredAt,
          },
        });
        return;
      default:
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            providerStatus: rawStatus,
            providerLastSyncedAt: occurredAt,
          },
        });
    }
  }

  private async syncDocumentToViewed(
    documentId: string,
    occurredAt: Date,
    rawStatus = 'document.viewed',
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { companyProfile: true },
    });

    if (!document) return;

    const billingState =
      !document.countedInBilling && document.companyProfile
        ? await this.getBillingState(
            document.companyProfile.id,
            document.companyProfile.isUnlimited,
            document.companyProfile.monthlyDocLimit,
          )
        : null;

    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.VIEWED,
        sentAt: document.sentAt ?? occurredAt,
        viewedAt: document.viewedAt ?? occurredAt,
        countedInBilling: document.companyProfile
          ? true
          : document.countedInBilling,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
        providerStatus: rawStatus,
        providerLastSyncedAt: occurredAt,
      },
    });
  }

  private async syncDocumentToSigned(
    documentId: string,
    occurredAt: Date,
    rawStatus = 'document.completed',
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { companyProfile: true },
    });

    if (!document) return;

    const billingState =
      !document.countedInBilling && document.companyProfile
        ? await this.getBillingState(
            document.companyProfile.id,
            document.companyProfile.isUnlimited,
            document.companyProfile.monthlyDocLimit,
          )
        : null;

    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.SIGNED,
        sentAt: document.sentAt ?? occurredAt,
        viewedAt: document.viewedAt ?? occurredAt,
        signedAt: document.signedAt ?? occurredAt,
        countedInBilling: document.companyProfile
          ? true
          : document.countedInBilling,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
        providerStatus: rawStatus,
        providerLastSyncedAt: occurredAt,
      },
    });
  }

  private async syncDocumentToCompleted(
    documentId: string,
    occurredAt: Date,
    rawStatus = 'document.completed',
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { companyProfile: true },
    });

    if (!document) return;

    const billingState =
      !document.countedInBilling && document.companyProfile
        ? await this.getBillingState(
            document.companyProfile.id,
            document.companyProfile.isUnlimited,
            document.companyProfile.monthlyDocLimit,
          )
        : null;

    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.COMPLETED,
        sentAt: document.sentAt ?? occurredAt,
        viewedAt: document.viewedAt ?? occurredAt,
        signedAt: document.signedAt ?? occurredAt,
        completedAt: document.completedAt ?? occurredAt,
        countedInBilling: document.companyProfile
          ? true
          : document.countedInBilling,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
        providerStatus: rawStatus,
        providerLastSyncedAt: occurredAt,
      },
    });
  }

  private async loadPublicDocumentForToken(token: string) {
    const { documentId, expiresAt } = this.verifyPublicSignatureToken(token);

    let document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: publicDocumentInclude,
    });

    if (!document || !document.providerDocumentId) {
      throw new NotFoundException('Public signature link is not available');
    }

    if (document.status !== DocumentStatus.COMPLETED) {
      const remoteStatus =
        await this.signatureProviderService.getDocumentStatus(
          document.providerDocumentId,
        );
      const syncedAt = new Date();

      await this.syncDocumentFromProviderStatus(
        document.id,
        remoteStatus.status,
        syncedAt,
      );

      document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: publicDocumentInclude,
      });
    }

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return { document, expiresAt };
  }

  private buildPublicSignatureLinks(documentId: string) {
    const { token, expiresAt } = this.createPublicSignatureToken(documentId);
    const appBaseUrl = this.getAppUrl();
    const backendBaseUrl = this.getBackendUrl();

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      completionUrl: `${appBaseUrl}/signature-complete?token=${encodeURIComponent(token)}`,
      previewUrl: `${backendBaseUrl}/public/signatures/${encodeURIComponent(token)}/preview`,
      downloadUrl: `${backendBaseUrl}/public/signatures/${encodeURIComponent(token)}/download`,
    };
  }

  private buildPublicSignerName(document: PublicDocument) {
    const data = this.normalizeJsonObject(document.data?.dataJson);

    return (
      this.firstNonEmptyString(
        this.readScalarString(data.customer_full_name),
        this.readScalarString(data.customer_name),
        this.readScalarString(data.client_name),
      ) ?? 'The signer'
    );
  }

  private buildPublicSenderName(document: PublicDocument) {
    const contactFullName = [
      document.companyProfile?.contactFirstName ?? '',
      document.companyProfile?.contactLastName ?? '',
    ]
      .filter((value) => value.trim().length > 0)
      .join(' ')
      .trim();

    return (
      this.firstNonEmptyString(
        contactFullName,
        document.companyProfile?.companyName,
        document.companyProfile?.legalName,
        document.user.email,
      ) ?? 'the sender'
    );
  }

  private createPublicSignatureToken(documentId: string) {
    const expiresAt = new Date(Date.now() + PUBLIC_SIGNATURE_LINK_TTL_MS);
    const payload: PublicSignatureTokenPayload = {
      v: 1,
      p: 'signature-complete',
      documentId,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const encodedPayload = Buffer.from(
      JSON.stringify(payload),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', this.getPublicSignatureSecret())
      .update(encodedPayload)
      .digest('base64url');

    return {
      token: `${encodedPayload}.${signature}`,
      expiresAt,
    };
  }

  private verifyPublicSignatureToken(token: string) {
    const [encodedPayload, receivedSignature] = token
      .trim()
      .split('.', 2)
      .filter(Boolean);

    if (!encodedPayload || !receivedSignature) {
      throw new BadRequestException('Invalid public signature token');
    }

    const expectedSignature = createHmac(
      'sha256',
      this.getPublicSignatureSecret(),
    )
      .update(encodedPayload)
      .digest('base64url');

    if (!this.safeCompare(expectedSignature, receivedSignature)) {
      throw new BadRequestException('Invalid public signature token');
    }

    let payload: PublicSignatureTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as PublicSignatureTokenPayload;
    } catch {
      throw new BadRequestException('Invalid public signature token');
    }

    if (
      payload.v !== 1 ||
      payload.p !== 'signature-complete' ||
      typeof payload.documentId !== 'string' ||
      !payload.documentId.trim() ||
      typeof payload.exp !== 'number'
    ) {
      throw new BadRequestException('Invalid public signature token');
    }

    const expiresAt = new Date(payload.exp * 1000);
    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('This secure signature link has expired');
    }

    return {
      documentId: payload.documentId,
      expiresAt,
    };
  }

  private getPublicSignatureSecret() {
    const secret = (
      process.env.PUBLIC_LINK_SECRET ?? process.env.JWT_SECRET
    )?.trim();

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'PUBLIC_LINK_SECRET (or JWT_SECRET) is required in production',
        );
      }
      return 'local-ntssign-public-link-secret';
    }

    return secret;
  }

  private safeCompare(expected: string, received: string) {
    try {
      return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(received, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  private getAppUrl() {
    return this.normalizeBaseUrl(
      process.env.APP_URL || 'http://127.0.0.1:3001',
    );
  }

  private getBackendUrl() {
    return this.normalizeBaseUrl(
      process.env.BACKEND_URL || 'http://127.0.0.1:3000',
    );
  }

  private normalizeBaseUrl(value: string) {
    return value.trim().replace(/\/$/, '');
  }

  private buildSignatureRecipient(document: LoadedDocument) {
    const data = this.normalizeJsonObject(document.data?.dataJson);
    const email = this.firstNonEmptyString(
      this.readScalarString(data.customer_email),
      this.readScalarString(data.client_email),
    );

    if (!email) {
      throw new BadRequestException(
        'Document is missing customer email required for the signature request',
      );
    }

    const fullName = this.firstNonEmptyString(
      this.readScalarString(data.customer_full_name),
      this.readScalarString(data.customer_name),
      this.readScalarString(data.client_name),
    );
    const { firstName, lastName } = this.splitName(
      fullName ?? email.split('@')[0],
    );

    return {
      email,
      name: [firstName, lastName].filter(Boolean).join(' ').trim() || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      role: document.signatureTemplate.recipientRole || 'BUYER',
    };
  }

  private buildSenderSignatureRecipient(document: LoadedDocument) {
    const senderEmail = this.firstNonEmptyString(
      document.companyProfile?.contactEmail,
      document.companyProfile?.email,
      document.user.email,
    );

    if (!senderEmail) {
      return null;
    }

    const contactFullName = [
      document.companyProfile?.contactFirstName ?? '',
      document.companyProfile?.contactLastName ?? '',
    ]
      .filter((value) => value.trim().length > 0)
      .join(' ')
      .trim();
    const senderName =
      this.firstNonEmptyString(
        contactFullName,
        document.companyProfile?.companyName,
        document.companyProfile?.legalName,
      ) ?? senderEmail.split('@')[0];
    const senderFirstName = document.companyProfile?.contactFirstName?.trim();
    const senderLastName = document.companyProfile?.contactLastName?.trim();
    const splitName =
      senderFirstName || senderLastName
        ? {
            firstName: senderFirstName ?? '',
            lastName: senderLastName ?? '',
          }
        : this.splitName(senderName);

    return {
      email: senderEmail,
      name: senderName,
      firstName: splitName.firstName || undefined,
      lastName: splitName.lastName || undefined,
    };
  }

  private buildSignatureDocumentName(
    document: Pick<LoadedDocument, 'documentNumber' | 'documentType' | 'data'>,
  ) {
    const data = this.normalizeJsonObject(document.data?.dataJson);
    const customerName = this.firstNonEmptyString(
      this.readScalarString(data.customer_full_name),
      this.readScalarString(data.customer_name),
      this.readScalarString(data.client_name),
    );

    return `${document.documentNumber} - ${customerName ?? document.documentType.name}`;
  }

  private normalizeExternalStatus(rawStatus: string) {
    const normalized = rawStatus.trim().toLowerCase();

    if (
      ['document.draft', 'document.uploaded', 'draft', 'draftcreated'].includes(
        normalized,
      )
    ) {
      return 'draft';
    }

    if (
      [
        'document.sent',
        'sent',
        'inprogress',
        'shared',
        'created',
        'signature_request_sent',
        'signature_request_delivered',
      ].includes(normalized)
    ) {
      return 'sent';
    }

    if (
      [
        'document.viewed',
        'viewed',
        'delivered',
        'signature_request_viewed',
      ].includes(normalized)
    ) {
      return 'viewed';
    }

    if (
      ['document.signed', 'signed', 'signature_request_signed'].includes(
        normalized,
      )
    ) {
      return 'signed';
    }

    if (
      [
        'document.completed',
        'completed',
        'signature_request_all_signed',
        'signature_request_downloadable',
      ].includes(normalized)
    ) {
      return 'completed';
    }

    if (
      [
        'document.declined',
        'document.voided',
        'declined',
        'cancelled',
        'canceled',
        'expired',
        'voided',
        'signature_request_declined',
        'signature_request_expired',
        'signature_request_reassigned',
        'revoked',
        'reassigned',
      ].includes(normalized)
    ) {
      return 'cancelled';
    }

    if (
      ['deliveryfailed', 'editfailed', 'needattention'].includes(normalized)
    ) {
      return 'error';
    }

    return normalized;
  }

  private buildMappingContext(document: LoadedDocument) {
    const data = this.normalizeJsonObject(document.data?.dataJson);

    return {
      document: {
        id: document.id,
        documentNumber: document.documentNumber,
        contractDate: document.contractDate
          ? document.contractDate.toISOString().slice(0, 10)
          : '',
        typeName: document.documentType.name,
        typeCode: document.documentType.code,
      },
      data,
      company: {
        companyName: document.companyProfile?.companyName ?? '',
        legalName: document.companyProfile?.legalName ?? '',
        email: document.companyProfile?.email ?? '',
        phone: document.companyProfile?.phone ?? '',
        website: document.companyProfile?.website ?? '',
        addressLine1: document.companyProfile?.addressLine1 ?? '',
        addressLine2: document.companyProfile?.addressLine2 ?? '',
        city: document.companyProfile?.city ?? '',
        state: document.companyProfile?.state ?? '',
        zipCode: document.companyProfile?.zipCode ?? '',
        country: document.companyProfile?.country ?? '',
        licenseNumber: document.companyProfile?.licenseNumber ?? '',
      },
      contact: {
        firstName: document.companyProfile?.contactFirstName ?? '',
        lastName: document.companyProfile?.contactLastName ?? '',
        title: document.companyProfile?.contactTitle ?? '',
        email: document.companyProfile?.contactEmail ?? '',
        phone: document.companyProfile?.contactPhone ?? '',
        addressLine1: document.companyProfile?.contactAddressLine1 ?? '',
        addressLine2: document.companyProfile?.contactAddressLine2 ?? '',
        city: document.companyProfile?.contactCity ?? '',
        state: document.companyProfile?.contactState ?? '',
        zipCode: document.companyProfile?.contactZipCode ?? '',
        country: document.companyProfile?.contactCountry ?? '',
      },
      user: {
        email: document.user.email,
        role: document.user.role,
      },
    };
  }

  private buildFallbackScalarMap(
    context: ReturnType<typeof this.buildMappingContext>,
  ) {
    const fallback: Record<string, ScalarValue> = {};
    const contactFullName = [
      context.contact.firstName,
      context.contact.lastName,
    ]
      .filter((value) => value.trim().length > 0)
      .join(' ')
      .trim();
    const companyFullAddress = [
      context.company.addressLine1,
      context.company.addressLine2,
    ]
      .filter((value) => value.trim().length > 0)
      .join(', ')
      .trim();
    const companyCityStateZip = this.formatCityStateZip(
      context.company.city,
      context.company.state,
      context.company.zipCode,
    );
    const customerFullAddress = this.firstNonEmptyString(
      this.readScalarString(context.data.customer_full_address),
      this.readScalarString(context.data.customer_address),
    );
    const customerCityStateZip = this.formatCityStateZip(
      this.readScalarString(context.data.city),
      this.readScalarString(context.data.state),
      this.readScalarString(context.data.zip),
    );

    this.assignScalarValue(
      fallback,
      'document_number',
      context.document.documentNumber,
    );
    this.assignScalarValue(
      fallback,
      'contract_date',
      context.document.contractDate,
    );
    this.assignScalarValue(
      fallback,
      'company_name',
      context.company.companyName,
    );
    this.assignScalarValue(fallback, 'company_email', context.company.email);
    this.assignScalarValue(fallback, 'company_phone', context.company.phone);
    this.assignScalarValue(
      fallback,
      'company_website',
      context.company.website,
    );
    this.assignScalarValue(
      fallback,
      'company_license_number',
      context.company.licenseNumber,
    );
    this.assignScalarValue(
      fallback,
      'company_full_address',
      companyFullAddress,
    );
    this.assignScalarValue(
      fallback,
      'company_city_state_zip',
      companyCityStateZip,
    );
    this.assignScalarValue(
      fallback,
      'contact_first_name',
      context.contact.firstName,
    );
    this.assignScalarValue(
      fallback,
      'contact_last_name',
      context.contact.lastName,
    );
    this.assignScalarValue(fallback, 'contact_full_name', contactFullName);
    this.assignScalarValue(fallback, 'contact_title', context.contact.title);
    this.assignScalarValue(fallback, 'contact_email', context.contact.email);
    this.assignScalarValue(fallback, 'contact_phone', context.contact.phone);
    this.assignScalarValue(
      fallback,
      'customer_full_address',
      customerFullAddress,
    );
    this.assignScalarValue(
      fallback,
      'customer_city_state_zip',
      customerCityStateZip,
    );

    for (const [key, value] of Object.entries(context.data)) {
      this.assignScalarValue(fallback, key, value);
    }

    return fallback;
  }

  private buildMappedTokens(
    mappingJson: Prisma.JsonValue | null,
    context: ReturnType<typeof this.buildMappingContext>,
    fallback: Record<string, ScalarValue>,
  ) {
    if (!this.isRecord(mappingJson)) {
      return Object.entries(fallback).map(([name, value]) => ({ name, value }));
    }

    const tokens = new Map<string, ScalarValue>();
    for (const [tokenName, definition] of Object.entries(mappingJson)) {
      const resolved = this.resolveMappingDefinition(
        definition as MappingDefinition,
        context,
        fallback,
      );
      if (resolved) tokens.set(tokenName, resolved.value);
    }

    return [...tokens.entries()].map(([name, value]) => ({ name, value }));
  }

  private buildMappedFields(
    mappingJson: Prisma.JsonValue | null,
    context: ReturnType<typeof this.buildMappingContext>,
    fallback: Record<string, ScalarValue>,
    recipientRole: string,
  ) {
    if (!this.isRecord(mappingJson)) {
      return Object.fromEntries(
        Object.entries(fallback).map(([name, value]) => [
          name,
          { value, role: recipientRole },
        ]),
      );
    }

    const fields: Record<string, { value: ScalarValue; role?: string }> = {};
    for (const [fieldName, definition] of Object.entries(mappingJson)) {
      const resolved = this.resolveMappingDefinition(
        definition as MappingDefinition,
        context,
        fallback,
      );
      if (resolved) {
        fields[fieldName] = {
          value: resolved.value,
          role: resolved.role ?? recipientRole,
        };
      }
    }

    return fields;
  }

  private resolveMappingDefinition(
    definition: MappingDefinition,
    context: ReturnType<typeof this.buildMappingContext>,
    fallback: Record<string, ScalarValue>,
  ) {
    if (typeof definition === 'string') {
      const scalarValue = this.coerceScalar(
        this.getValueByPath(context, definition) ?? fallback[definition],
      );
      return scalarValue == null ? null : { value: scalarValue };
    }

    if (this.isRecord(definition) && typeof definition.path === 'string') {
      const scalarValue = this.coerceScalar(
        this.getValueByPath(context, definition.path) ??
          fallback[definition.path],
      );
      if (scalarValue == null) return null;

      return {
        value: scalarValue,
        role:
          typeof definition.role === 'string' && definition.role.trim()
            ? definition.role.trim()
            : undefined,
      };
    }

    return null;
  }

  private renderTextTemplate(
    template: string | null,
    context: ReturnType<typeof this.buildMappingContext>,
    fallback: string,
  ) {
    if (!template?.trim()) return fallback;

    return template.replace(
      /\{\{\s*([^}]+)\s*\}\}/g,
      (_match, path: string) => {
        const scalarValue = this.coerceScalar(
          this.getValueByPath(context, path.trim()),
        );
        return scalarValue == null ? '' : String(scalarValue);
      },
    );
  }

  private normalizeJsonObject(value: Prisma.JsonValue | null | undefined) {
    return this.isRecord(value)
      ? (value as Record<string, Prisma.JsonValue>)
      : ({} as Record<string, Prisma.JsonValue>);
  }

  private isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private readScalarString(value: Prisma.JsonValue | undefined) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private firstNonEmptyString(...values: Array<string | null | undefined>) {
    return values.find((value) => typeof value === 'string' && value.trim());
  }

  private splitName(value: string) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) return { firstName: '', lastName: '' };

    const parts = normalized.split(' ');
    return parts.length === 1
      ? { firstName: parts[0], lastName: '' }
      : { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private assignScalarValue(
    target: Record<string, ScalarValue>,
    key: string,
    value: unknown,
  ) {
    const scalarValue = this.coerceScalar(value);
    if (scalarValue != null) target[key] = scalarValue;
  }

  private formatCityStateZip(
    city: string | null | undefined,
    state: string | null | undefined,
    zipCode: string | null | undefined,
  ) {
    const cityValue = city?.trim() ?? '';
    const stateValue = state?.trim() ?? '';
    const zipValue = zipCode?.trim() ?? '';
    const cityState = [cityValue, stateValue].filter(Boolean).join(', ');
    return [cityState, zipValue].filter(Boolean).join(' ').trim();
  }

  private coerceScalar(value: unknown): ScalarValue | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    return null;
  }

  private getValueByPath(source: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, segment) => {
      if (!this.isRecord(current)) return undefined;
      return current[segment];
    }, source);
  }

  private readStringValue(source: Record<string, any>, paths: string[]) {
    for (const path of paths) {
      const value = this.getValueByPath(source, path);
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }
}
