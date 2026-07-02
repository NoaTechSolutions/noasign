import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';
import { UpdateFormDefinitionDto } from './dto/update-form-definition.dto';
import { CreateSignatureTemplateDto } from './dto/create-signature-template.dto';
import { UpdateSignatureTemplateDto } from './dto/update-signature-template.dto';
import { CreateUserDocumentConfigDto } from './dto/create-user-document-config.dto';
import { LockedUserDto } from './dto/locked-user.dto';

// Identifies the kind of admin action in AdminAuditLog.action. String-literal
// (not enum) so the audit table grows with new verbs without a migration.
// Convention: SCREAMING_SNAKE_CASE, verb-object.
export const ADMIN_ACTION = {
  UNLOCK_USER: 'UNLOCK_USER',
} as const;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private async assertRootMaster(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SUPERADMIN || user.parentCompanyProfileId !== null) {
      throw new ForbiddenException('Only the root master account can manage admin resources');
    }

    return user;
  }

  // ── DocumentType (read-only helpers for admin UI) ────────────────────────

  async listDocumentTypes(userId: string) {
    await this.assertRootMaster(userId);

    return this.prisma.documentType.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── FormDefinition CRUD ──────────────────────────────────────────────────

  async createFormDefinition(userId: string, dto: CreateFormDefinitionDto) {
    await this.assertRootMaster(userId);

    const documentType = await this.prisma.documentType.findUnique({
      where: { id: dto.documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException(`DocumentType ${dto.documentTypeId} not found`);
    }

    return this.prisma.formDefinition.create({
      data: {
        name: dto.name,
        documentTypeId: dto.documentTypeId,
        schemaJson: dto.schemaJson ?? undefined,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { documentType: true },
    });
  }

  async listFormDefinitions(userId: string, documentTypeId?: string) {
    await this.assertRootMaster(userId);

    return this.prisma.formDefinition.findMany({
      where: documentTypeId ? { documentTypeId } : undefined,
      include: {
        documentType: true,
        _count: { select: { userConfigs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFormDefinition(userId: string, id: string) {
    await this.assertRootMaster(userId);

    const formDef = await this.prisma.formDefinition.findUnique({
      where: { id },
      include: { documentType: true },
    });

    if (!formDef) {
      throw new NotFoundException(`FormDefinition ${id} not found`);
    }

    return formDef;
  }

  async updateFormDefinition(userId: string, id: string, dto: UpdateFormDefinitionDto) {
    await this.assertRootMaster(userId);

    const existing = await this.prisma.formDefinition.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FormDefinition ${id} not found`);
    }

    if (dto.documentTypeId) {
      const documentType = await this.prisma.documentType.findUnique({
        where: { id: dto.documentTypeId },
      });
      if (!documentType) {
        throw new NotFoundException(`DocumentType ${dto.documentTypeId} not found`);
      }
    }

    const data: Parameters<typeof this.prisma.formDefinition.update>[0]['data'] = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.documentTypeId !== undefined) data.documentTypeId = dto.documentTypeId;
    if (dto.schemaJson !== undefined) data.schemaJson = dto.schemaJson as object;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.formDefinition.update({
      where: { id },
      data,
      include: { documentType: true },
    });
  }

  async deleteFormDefinition(userId: string, id: string) {
    await this.assertRootMaster(userId);

    const existing = await this.prisma.formDefinition.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FormDefinition ${id} not found`);
    }

    await this.prisma.formDefinition.delete({ where: { id } });

    return { message: 'FormDefinition deleted successfully' };
  }

  // ── SignatureTemplate CRUD ───────────────────────────────────────────────

  async createSignatureTemplate(userId: string, dto: CreateSignatureTemplateDto) {
    await this.assertRootMaster(userId);

    const documentType = await this.prisma.documentType.findUnique({
      where: { id: dto.documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException(`DocumentType ${dto.documentTypeId} not found`);
    }

    return this.prisma.signatureTemplate.create({
      data: {
        name: dto.name,
        documentTypeId: dto.documentTypeId,
        providerTemplateId: dto.providerTemplateId,
        recipientRole: dto.recipientRole ?? 'Client',
        tokenMappingJson: dto.tokenMappingJson ?? undefined,
        fieldMappingJson: dto.fieldMappingJson ?? undefined,
        sendSubjectTemplate: dto.sendSubjectTemplate,
        sendMessageTemplate: dto.sendMessageTemplate,
        isActive: dto.isActive ?? true,
      },
      include: { documentType: true },
    });
  }

  async listSignatureTemplates(userId: string, documentTypeId?: string) {
    await this.assertRootMaster(userId);

    return this.prisma.signatureTemplate.findMany({
      where: documentTypeId ? { documentTypeId } : undefined,
      include: { documentType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSignatureTemplate(userId: string, id: string) {
    await this.assertRootMaster(userId);

    const template = await this.prisma.signatureTemplate.findUnique({
      where: { id },
      include: { documentType: true },
    });

    if (!template) {
      throw new NotFoundException(`SignatureTemplate ${id} not found`);
    }

    return template;
  }

  async updateSignatureTemplate(userId: string, id: string, dto: UpdateSignatureTemplateDto) {
    await this.assertRootMaster(userId);

    const existing = await this.prisma.signatureTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`SignatureTemplate ${id} not found`);
    }

    if (dto.documentTypeId) {
      const documentType = await this.prisma.documentType.findUnique({
        where: { id: dto.documentTypeId },
      });
      if (!documentType) {
        throw new NotFoundException(`DocumentType ${dto.documentTypeId} not found`);
      }
    }

    const data: Parameters<typeof this.prisma.signatureTemplate.update>[0]['data'] = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.documentTypeId !== undefined) data.documentTypeId = dto.documentTypeId;
    if (dto.providerTemplateId !== undefined) data.providerTemplateId = dto.providerTemplateId;
    if (dto.recipientRole !== undefined) data.recipientRole = dto.recipientRole;
    if (dto.tokenMappingJson !== undefined) data.tokenMappingJson = dto.tokenMappingJson as object;
    if (dto.fieldMappingJson !== undefined) data.fieldMappingJson = dto.fieldMappingJson as object;
    if (dto.sendSubjectTemplate !== undefined) data.sendSubjectTemplate = dto.sendSubjectTemplate;
    if (dto.sendMessageTemplate !== undefined) data.sendMessageTemplate = dto.sendMessageTemplate;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.signatureTemplate.update({
      where: { id },
      data,
      include: { documentType: true },
    });
  }

  async deleteSignatureTemplate(userId: string, id: string) {
    await this.assertRootMaster(userId);

    const existing = await this.prisma.signatureTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`SignatureTemplate ${id} not found`);
    }

    await this.prisma.signatureTemplate.delete({ where: { id } });

    return { message: 'SignatureTemplate deleted successfully' };
  }

  // ── UserDocumentConfig assignments ───────────────────────────────────────

  async createUserDocumentConfig(userId: string, dto: CreateUserDocumentConfigDto) {
    await this.assertRootMaster(userId);

    const [targetUser, documentType, formDefinition, signatureTemplate] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.documentType.findUnique({ where: { id: dto.documentTypeId } }),
      this.prisma.formDefinition.findUnique({ where: { id: dto.formDefinitionId } }),
      this.prisma.signatureTemplate.findUnique({ where: { id: dto.signatureTemplateId } }),
    ]);

    if (!targetUser) throw new NotFoundException(`User ${dto.userId} not found`);
    if (!documentType) throw new NotFoundException(`DocumentType ${dto.documentTypeId} not found`);
    if (!formDefinition) throw new NotFoundException(`FormDefinition ${dto.formDefinitionId} not found`);
    if (!signatureTemplate) throw new NotFoundException(`SignatureTemplate ${dto.signatureTemplateId} not found`);

    if (formDefinition.documentTypeId !== dto.documentTypeId) {
      throw new NotFoundException(`FormDefinition does not belong to DocumentType ${dto.documentTypeId}`);
    }

    if (signatureTemplate.documentTypeId !== dto.documentTypeId) {
      throw new NotFoundException(`SignatureTemplate does not belong to DocumentType ${dto.documentTypeId}`);
    }

    return this.prisma.userDocumentConfig.create({
      data: {
        userId: dto.userId,
        documentTypeId: dto.documentTypeId,
        formDefinitionId: dto.formDefinitionId,
        signatureTemplateId: dto.signatureTemplateId,
        isActive: dto.isActive ?? true,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        documentType: true,
        formDefinition: true,
        signatureTemplate: true,
      },
    });
  }

  async listUserDocumentConfigs(userId: string, targetUserId?: string) {
    await this.assertRootMaster(userId);

    return this.prisma.userDocumentConfig.findMany({
      where: targetUserId ? { userId: targetUserId } : undefined,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        documentType: true,
        formDefinition: true,
        signatureTemplate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleUserDocumentConfig(userId: string, id: string, isActive: boolean) {
    await this.assertRootMaster(userId);

    const existing = await this.prisma.userDocumentConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`UserDocumentConfig ${id} not found`);
    }

    return this.prisma.userDocumentConfig.update({
      where: { id },
      data: { isActive },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        documentType: true,
        formDefinition: true,
        signatureTemplate: true,
      },
    });
  }

  async deleteUserDocumentConfig(userId: string, id: string) {
    await this.assertRootMaster(userId);

    const existing = await this.prisma.userDocumentConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`UserDocumentConfig ${id} not found`);
    }

    await this.prisma.userDocumentConfig.delete({ where: { id } });

    return { message: 'UserDocumentConfig removed successfully' };
  }

  // ── User lockout management (MASTER-only) ────────────────────────────────

  async listLockedUsers(userId: string): Promise<LockedUserDto[]> {
    await this.assertRootMaster(userId);

    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { lockedUntil: { gt: now } },
          { lockLevel: { gte: 3 } },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        failedLoginAttempts: true,
        lockLevel: true,
        lockedUntil: true,
      },
      orderBy: { lockedUntil: 'asc' },
    });

    return users
      .filter((u) => u.lockedUntil !== null)
      .map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        failedLoginAttempts: u.failedLoginAttempts,
        lockLevel: u.lockLevel,
        lockedUntil: u.lockedUntil!,
      }));
  }

  async unlockUser(
    actorId: string,
    targetUserId: string,
  ): Promise<{ success: true; userId: string }> {
    await this.assertRootMaster(actorId);

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        lockedUntil: true,
        lockLevel: true,
        failedLoginAttempts: true,
      },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          lockedUntil: null,
          lockLevel: 0,
          failedLoginAttempts: 0,
        },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          actorId,
          action: ADMIN_ACTION.UNLOCK_USER,
          targetUserId,
          payload: {
            previousLockedUntil: target.lockedUntil?.toISOString() ?? null,
            previousLockLevel: target.lockLevel,
            previousFailedAttempts: target.failedLoginAttempts,
          },
        },
      }),
    ]);

    // Fire-and-forget — unlock succeeded; email is courtesy, must not block.
    void this.sendAccountUnlockedEmail(target.email);

    return { success: true, userId: targetUserId };
  }

  private async sendAccountUnlockedEmail(email: string): Promise<void> {
    try {
      await this.emailService.sendAccountUnlockedEmail({ to: email });
    } catch {
      // EmailService logged it.
    }
  }
}
