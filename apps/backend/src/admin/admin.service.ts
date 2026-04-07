import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';
import { UpdateFormDefinitionDto } from './dto/update-form-definition.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private async assertRootMaster(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.MASTER || user.parentCompanyProfileId !== null) {
      throw new ForbiddenException('Only the root master account can manage admin resources');
    }

    return user;
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
      include: { documentType: true },
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
}
