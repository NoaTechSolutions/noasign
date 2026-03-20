import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDraftDocumentDto } from './dto/create-draft-document.dto';
import { UpdateDraftDocumentDto } from './dto/update-draft-document.dto';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private getCurrentBillingPeriod(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private async getBillingState(companyId: string, isUnlimited: boolean, monthlyDocLimit: number) {
    const now = new Date();
    const billingPeriod = this.getCurrentBillingPeriod(now);

    const countedDocuments = await this.prisma.document.count({
      where: {
        companyProfileId: companyId,
        countedInBilling: true,
        billingPeriod,
      },
    });

    const isOverage =
      !isUnlimited && countedDocuments >= monthlyDocLimit;

    return {
      now,
      billingPeriod,
      isOverage,
    };
  }

  async getDocumentTypes() {
    return this.prisma.documentType.findMany({
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
  }

  private async generateDocumentNumber(documentTypeId: string): Promise<string> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    const count = await this.prisma.document.count({
      where: { documentTypeId },
    });

    const nextNumber = count + 1;
    const padded = String(nextNumber).padStart(6, '0');

    return `${documentType.code}-${padded}`;
  }

  async createDraftDocument(userId: string, body: CreateDraftDocumentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.companyProfileId) {
      throw new BadRequestException('User does not have a company profile');
    }

    const documentType = await this.prisma.documentType.findUnique({
      where: { id: body.documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    const formDefinition = await this.prisma.formDefinition.findUnique({
      where: { id: body.formDefinitionId },
    });

    if (!formDefinition) {
      throw new NotFoundException('Form definition not found');
    }

    const pandadocTemplate = await this.prisma.pandaDocTemplate.findUnique({
      where: { id: body.pandadocTemplateId },
    });

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

    const documentNumber = await this.generateDocumentNumber(body.documentTypeId);

    const document = await this.prisma.document.create({
      data: {
        documentNumber,
        userId: user.id,
        companyProfileId: user.companyProfileId,
        documentTypeId: body.documentTypeId,
        formDefinitionId: body.formDefinitionId,
        pandadocTemplateId: body.pandadocTemplateId,
        status: DocumentStatus.DRAFT,
        contractDate: new Date(body.contractDate),
        countedInBilling: false,
        isOverage: false,
        data: {
          create: {
            dataJson: body.dataJson,
          },
        },
      },
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
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
      document,
    };
  }

  async getMyDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      include: {
        documentType: true,
        formDefinition: true,
        data: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDocumentDetail(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async updateDraftDocument(
    userId: string,
    documentId: string,
    body: UpdateDraftDocumentDto,
  ) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        data: true,
        versions: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be edited');
    }

    const nextVersionNumber = document.versions.length + 1;

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        contractDate: new Date(body.contractDate),
        data: {
          update: {
            dataJson: body.dataJson,
          },
        },
      },
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: nextVersionNumber,
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
      where: {
        id: documentId,
        userId,
      },
      include: {
        companyProfile: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be sent');
    }

    if (!document.companyProfile) {
      throw new BadRequestException('Company profile not found');
    }

    const fakePandaDocId = `pd-${Date.now()}`;

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.SENT,
        sentAt: new Date(),
        countedInBilling: false,
        isOverage: false,
        billingPeriod: null,
        pandadocDocumentId: fakePandaDocId,
      },
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
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
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

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
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });

    return {
      message: 'Document cancelled successfully',
      document: updatedDocument,
    };
  }

  async reactivateDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        data: true,
        versions: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

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

    const nextVersionNumber = document.versions.length + 1;

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: nextVersionNumber,
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
      where: {
        id: documentId,
        userId,
      },
      include: {
        companyProfile: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

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
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });

    return {
      message: 'Document marked as viewed successfully',
      document: updatedDocument,
    };
  }

  async simulateDocumentSigned(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        companyProfile: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

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
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });

    return {
      message: 'Document marked as signed successfully',
      document: updatedDocument,
    };
  }

  async simulateDocumentCompleted(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        companyProfile: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

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
      include: {
        documentType: true,
        formDefinition: true,
        pandadocTemplate: true,
        data: true,
      },
    });

    return {
      message: 'Document marked as completed successfully',
      document: updatedDocument,
    };
  }
}
