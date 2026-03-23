import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PandaDocService } from '../pandadoc/pandadoc.service';
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
    pandadocTemplate: true;
    data: true;
    versions: true;
  };
}>;

const documentDetailInclude = {
  documentType: true,
  formDefinition: true,
  pandadocTemplate: true,
  data: true,
} satisfies Prisma.DocumentInclude;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PandaDocService))
    private readonly pandaDocService: PandaDocService,
  ) {}

  private getCurrentBillingPeriod(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
    return this.prisma.documentType.findMany({
      include: {
        formDefinitions: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        pandaTemplates: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
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

    const count = await this.prisma.document.count({ where: { documentTypeId } });
    const nextNumber = count + 1;
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

    const [documentType, formDefinition, pandadocTemplate] = await Promise.all([
      this.prisma.documentType.findUnique({ where: { id: body.documentTypeId } }),
      this.prisma.formDefinition.findUnique({
        where: { id: body.formDefinitionId },
      }),
      this.prisma.pandaDocTemplate.findUnique({
        where: { id: body.pandadocTemplateId },
      }),
    ]);

    if (!documentType) throw new NotFoundException('Document type not found');
    if (!formDefinition) throw new NotFoundException('Form definition not found');
    if (!pandadocTemplate) {
      throw new NotFoundException('PandaDoc template not found');
    }
    if (formDefinition.documentTypeId !== body.documentTypeId) {
      throw new BadRequestException(
        'Form definition does not belong to the selected document type',
      );
    }
    if (pandadocTemplate.documentTypeId !== body.documentTypeId) {
      throw new BadRequestException(
        'PandaDoc template does not belong to the selected document type',
      );
    }

    const document = await this.prisma.document.create({
      data: {
        documentNumber: await this.generateDocumentNumber(body.documentTypeId),
        userId: user.id,
        companyProfileId: user.companyProfileId,
        documentTypeId: body.documentTypeId,
        formDefinitionId: body.formDefinitionId,
        pandadocTemplateId: body.pandadocTemplateId,
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

    return { message: 'Draft document created successfully', document };
  }

  async getMyDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      include: {
        documentType: true,
        formDefinition: true,
        data: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentDetail(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        ...documentDetailInclude,
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async updateDraftDocument(
    userId: string,
    documentId: string,
    body: UpdateDraftDocumentDto,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
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
      document: updatedDocument,
    };
  }

  async sendDraftDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        companyProfile: true,
        user: true,
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
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
    if (!document.pandadocTemplate?.pandadocTemplateId) {
      throw new BadRequestException('PandaDoc template is not configured');
    }

    const context = this.buildMappingContext(document);
    const syncTimestamp = new Date();
    let pandaDocDocumentId = document.pandadocDocumentId;
    let pandaDocStatus = document.pandadocStatus;

    if (!pandaDocDocumentId) {
      const recipient = this.buildPandaDocRecipient(document);
      const fallbackFields = this.buildFallbackScalarMap(context);
      const createdDocument =
        await this.pandaDocService.createDocumentFromTemplate({
          name: this.buildPandaDocDocumentName(document),
          templateUuid: document.pandadocTemplate.pandadocTemplateId,
          recipients: [recipient],
          tokens: this.buildMappedTokens(
            document.pandadocTemplate.tokenMappingJson,
            context,
            fallbackFields,
          ),
          fields: this.buildMappedFields(
            document.pandadocTemplate.fieldMappingJson,
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
        });

      pandaDocDocumentId = createdDocument.id;
      pandaDocStatus = createdDocument.status;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          pandadocDocumentId: pandaDocDocumentId,
          pandadocStatus: pandaDocStatus,
          pandadocLastSyncedAt: syncTimestamp,
        },
      });
    } else {
      const remoteStatus = await this.pandaDocService.getDocumentStatus(
        pandaDocDocumentId,
      );
      pandaDocStatus = remoteStatus.status;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          pandadocStatus: pandaDocStatus,
          pandadocLastSyncedAt: syncTimestamp,
        },
      });

      if (
        pandaDocStatus &&
        !['document.uploaded', 'document.draft'].includes(pandaDocStatus)
      ) {
        await this.syncDocumentFromPandaDocStatus(
          document.id,
          pandaDocStatus,
          syncTimestamp,
        );
        throw new BadRequestException(
          'This draft is already linked to an active PandaDoc document',
        );
      }
    }

    if (!pandaDocDocumentId) {
      throw new BadRequestException('Unable to resolve PandaDoc document ID');
    }

    if (pandaDocStatus !== 'document.draft') {
      const readyStatus = await this.pandaDocService.waitForDocumentDraft(
        pandaDocDocumentId,
      );
      pandaDocStatus = readyStatus.status;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          pandadocStatus: pandaDocStatus,
          pandadocLastSyncedAt: new Date(),
        },
      });
    }

    await this.pandaDocService.sendDocument(pandaDocDocumentId, {
      subject: this.renderPandaDocTextTemplate(
        document.pandadocTemplate.sendSubjectTemplate,
        context,
        `Please review and sign ${document.documentNumber}`,
      ),
      message: this.renderPandaDocTextTemplate(
        document.pandadocTemplate.sendMessageTemplate,
        context,
        `Hello, please review and sign ${document.documentNumber} sent from NoaSign.`,
      ),
    });

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.SENT,
        sentAt: new Date(),
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
        pandadocDocumentId: pandaDocDocumentId,
        pandadocStatus: 'document.sent',
        pandadocLastSyncedAt: new Date(),
      },
      include: documentDetailInclude,
    });

    return {
      message: 'Document sent successfully',
      isOverage: false,
      billingPeriod: null,
      document: updatedDocument,
    };
  }

  async cancelDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
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

    return { message: 'Document cancelled successfully', document: updatedDocument };
  }

  async reactivateDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
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
        pandadocDocumentId: null,
        pandadocStatus: null,
        pandadocLastSyncedAt: null,
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
      document: updatedDocument,
    };
  }

  async simulateDocumentViewed(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
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
      document: updatedDocument,
    };
  }

  async simulateDocumentSigned(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
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
      document: updatedDocument,
    };
  }

  async simulateDocumentCompleted(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
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
      document: updatedDocument,
    };
  }

  async handlePandaDocWebhook(payload: unknown) {
    const events = Array.isArray(payload) ? payload : payload ? [payload] : [];

    for (const event of events) {
      await this.handleSinglePandaDocWebhook(event);
    }
  }

  private async handleSinglePandaDocWebhook(payload: unknown) {
    if (!this.isRecord(payload)) return;

    const eventType = this.readStringValue(payload, [
      'event',
      'event_type',
      'type',
      'name',
    ]);
    const rawStatus = this.readStringValue(payload, [
      'data.status',
      'status',
      'document.status',
    ]);
    const pandaDocDocumentId = this.readStringValue(payload, [
      'data.id',
      'id',
      'document.id',
    ]);
    const noasignDocumentId = this.readStringValue(payload, [
      'data.metadata.noasignDocumentId',
      'metadata.noasignDocumentId',
    ]);
    const occurredAtValue = this.readStringValue(payload, [
      'data.date_modified',
      'date_modified',
      'data.date_created',
      'date_created',
      'created_at',
    ]);
    const occurredAt = occurredAtValue ? new Date(occurredAtValue) : new Date();

    const document = noasignDocumentId
      ? await this.prisma.document.findUnique({
          where: { id: noasignDocumentId },
          include: { companyProfile: true },
        })
      : pandaDocDocumentId
        ? await this.prisma.document.findFirst({
            where: { pandadocDocumentId: pandaDocDocumentId },
            include: { companyProfile: true },
          })
        : null;

    if (!document) return;

    if (eventType) {
      const normalized = eventType.toLowerCase();
      if (normalized.includes('recipient') && normalized.includes('completed')) {
        await this.syncDocumentToSigned(document.id, occurredAt);
        return;
      }

      if (normalized.includes('creation') && normalized.includes('failed')) {
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            pandadocStatus: rawStatus ?? 'document.error',
            pandadocLastSyncedAt: occurredAt,
          },
        });
        return;
      }
    }

    if (rawStatus) {
      await this.syncDocumentFromPandaDocStatus(
        document.id,
        rawStatus,
        occurredAt,
      );
    }
  }

  private async syncDocumentFromPandaDocStatus(
    documentId: string,
    rawStatus: string,
    occurredAt: Date,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { companyProfile: true },
    });

    if (!document) return;

    switch (rawStatus) {
      case 'document.draft':
      case 'document.uploaded':
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            pandadocStatus: rawStatus,
            pandadocLastSyncedAt: occurredAt,
          },
        });
        return;
      case 'document.sent':
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.SENT,
            sentAt: document.sentAt ?? occurredAt,
            pandadocStatus: rawStatus,
            pandadocLastSyncedAt: occurredAt,
          },
        });
        return;
      case 'document.viewed':
        await this.syncDocumentToViewed(document.id, occurredAt, rawStatus);
        return;
      case 'document.completed':
        await this.syncDocumentToCompleted(document.id, occurredAt, rawStatus);
        return;
      case 'document.declined':
      case 'document.voided':
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.CANCELLED,
            cancelledAt: document.cancelledAt ?? occurredAt,
            pandadocStatus: rawStatus,
            pandadocLastSyncedAt: occurredAt,
          },
        });
        return;
      default:
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            pandadocStatus: rawStatus,
            pandadocLastSyncedAt: occurredAt,
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
        countedInBilling: document.companyProfile ? true : document.countedInBilling,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
        pandadocStatus: rawStatus,
        pandadocLastSyncedAt: occurredAt,
      },
    });
  }

  private async syncDocumentToSigned(documentId: string, occurredAt: Date) {
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
        countedInBilling: document.companyProfile ? true : document.countedInBilling,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
        pandadocStatus: 'document.completed',
        pandadocLastSyncedAt: occurredAt,
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
        countedInBilling: document.companyProfile ? true : document.countedInBilling,
        isOverage: billingState?.isOverage ?? document.isOverage,
        billingPeriod: billingState?.billingPeriod ?? document.billingPeriod,
        pandadocStatus: rawStatus,
        pandadocLastSyncedAt: occurredAt,
      },
    });
  }

  private buildPandaDocRecipient(document: LoadedDocument) {
    const data = this.normalizeJsonObject(document.data?.dataJson);
    const email = this.firstNonEmptyString(
      this.readScalarString(data.customer_email),
      this.readScalarString(data.client_email),
    );

    if (!email) {
      throw new BadRequestException(
        'Document is missing customer email required by PandaDoc',
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
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      role: document.pandadocTemplate.recipientRole || 'Client',
    };
  }

  private buildPandaDocDocumentName(document: LoadedDocument) {
    return `${document.documentNumber} - ${document.documentType.name}`;
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
    const contactFullName = [context.contact.firstName, context.contact.lastName]
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
    this.assignScalarValue(fallback, 'contract_date', context.document.contractDate);
    this.assignScalarValue(fallback, 'company_name', context.company.companyName);
    this.assignScalarValue(fallback, 'company_email', context.company.email);
    this.assignScalarValue(fallback, 'company_phone', context.company.phone);
    this.assignScalarValue(fallback, 'company_website', context.company.website);
    this.assignScalarValue(
      fallback,
      'company_license_number',
      context.company.licenseNumber,
    );
    this.assignScalarValue(fallback, 'company_full_address', companyFullAddress);
    this.assignScalarValue(
      fallback,
      'company_city_state_zip',
      companyCityStateZip,
    );
    this.assignScalarValue(fallback, 'contact_first_name', context.contact.firstName);
    this.assignScalarValue(fallback, 'contact_last_name', context.contact.lastName);
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
  ) {
    if (typeof definition === 'string') {
      const scalarValue = this.coerceScalar(this.getValueByPath(context, definition));
      return scalarValue == null ? null : { value: scalarValue };
    }

    if (this.isRecord(definition) && typeof definition.path === 'string') {
      const scalarValue = this.coerceScalar(
        this.getValueByPath(context, definition.path),
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

  private renderPandaDocTextTemplate(
    template: string | null,
    context: ReturnType<typeof this.buildMappingContext>,
    fallback: string,
  ) {
    if (!template?.trim()) return fallback;

    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, path: string) => {
      const scalarValue = this.coerceScalar(this.getValueByPath(context, path.trim()));
      return scalarValue == null ? '' : String(scalarValue);
    });
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
