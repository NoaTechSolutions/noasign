import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReceiptTemplateStandard,
  TemplateCategory,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SelectableCategory } from './dto/set-active-template.dto';

// One entry the Templates screen renders: catalog metadata + the tenant's
// current selection state + where to fetch the preview thumbnail.
export interface TemplateCatalogItem {
  slug: string;
  name: string;
  description: string | null;
  renderMode: string;
  category: TemplateCategory | null;
  // Path (relative to the API base) of the pre-generated PNG preview. The
  // frontend joins it with the API URL. Public route — no auth needed.
  // previewUrl = the cropped receipt band (card thumbnail).
  // fullPreviewUrl = the full Letter page render (the "Preview" modal).
  previewUrl: string;
  fullPreviewUrl: string;
  // True when THIS standard is the tenant's active/default for the category.
  isActive: boolean;
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  static previewUrlFor(slug: string): string {
    return `/templates/previews/${slug}.png`;
  }

  static fullPreviewUrlFor(slug: string): string {
    return `/templates/previews/${slug}-full.png`;
  }

  private async userContext(
    userId: string,
  ): Promise<{ companyProfileId: string; isSuperadmin: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyProfileId: true, role: true },
    });
    if (!user?.companyProfileId) {
      throw new BadRequestException('User has no company profile');
    }
    return {
      companyProfileId: user.companyProfileId,
      isSuperadmin: user.role === 'SUPERADMIN',
    };
  }

  // Visibility filter for the catalog: a tenant sees GLOBAL standards
  // (ownerCompanyProfileId null) plus the ones PRIVATE to itself. SUPERADMIN
  // bypasses this (sees all). Spread into a Prisma `where`.
  private visibleToTenant(companyProfileId: string) {
    return {
      OR: [
        { ownerCompanyProfileId: null },
        { ownerCompanyProfileId: companyProfileId },
      ],
    };
  }

  // Resolve which catalog standard is the tenant's active default for a category.
  // Source of truth: the CompanyTemplate marked isDefault. We map it back to a
  // catalog slug via the per-tenant instance's standardId (or a direct standard
  // ref, if one is ever set). Returns null when the tenant has no selection yet
  // or the active instance is a fully-custom template (no catalog origin).
  private async activeStandardId(
    companyProfileId: string,
    category: TemplateCategory,
  ): Promise<string | null> {
    const active = await this.prisma.companyTemplate.findFirst({
      where: { companyProfileId, category, isDefault: true, isActive: true },
      include: { receiptTemplate: { select: { standardId: true } } },
    });
    if (!active) return null;
    return (
      active.receiptTemplate?.standardId ?? active.receiptStandardId ?? null
    );
  }

  async listForCategory(
    userId: string,
    category: SelectableCategory,
  ): Promise<TemplateCatalogItem[]> {
    const { companyProfileId, isSuperadmin } = await this.userContext(userId);
    // Invariant: a tenant always has exactly one active template per category.
    // Self-heal any tenant with zero before we read.
    await this.ensureActive(companyProfileId, category);
    const standards = await this.prisma.receiptTemplateStandard.findMany({
      where: {
        category,
        isActive: true,
        // SUPERADMIN sees every template; a tenant sees global + its own private.
        ...(isSuperadmin ? {} : this.visibleToTenant(companyProfileId)),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    const activeId = await this.activeStandardId(companyProfileId, category);

    return standards.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      renderMode: s.renderMode,
      category: s.category,
      previewUrl: TemplatesService.previewUrlFor(s.slug),
      fullPreviewUrl: TemplatesService.fullPreviewUrlFor(s.slug),
      isActive: s.id === activeId,
    }));
  }

  // Set the tenant's active template for a category to the given catalog slug.
  // Strategy (A-lite): provision-or-reuse a per-tenant ReceiptTemplate instance
  // from the standard, then point the tenant's CompanyTemplate default at that
  // instance — keeping Document.receiptTemplateId a valid FK, no schema change.
  async setActive(
    userId: string,
    category: SelectableCategory,
    slug: string,
  ): Promise<TemplateCatalogItem[]> {
    const { companyProfileId, isSuperadmin } = await this.userContext(userId);

    // A tenant may only activate a template it can SEE (global or its own
    // private) — otherwise the list filter would be bypassable via this call.
    const standard = await this.prisma.receiptTemplateStandard.findFirst({
      where: {
        slug,
        category,
        isActive: true,
        ...(isSuperadmin ? {} : this.visibleToTenant(companyProfileId)),
      },
    });
    if (!standard) {
      throw new NotFoundException(
        `No active ${category} template found for slug "${slug}"`,
      );
    }

    await this.applyActive(companyProfileId, category, standard);

    return this.listForCategory(userId, category);
  }

  // Guarantee the "exactly one active per category" invariant: if the tenant has
  // no active default, force the catalog default (isDefault standard, else the
  // first active one). Idempotent — a no-op when a default already exists (even
  // a fully-custom one), so it never overrides an explicit choice.
  private async ensureActive(
    companyProfileId: string,
    category: TemplateCategory,
  ): Promise<void> {
    const existing = await this.prisma.companyTemplate.findFirst({
      where: { companyProfileId, category, isDefault: true, isActive: true },
    });
    if (existing) return;
    // K1: prefer the tenant's OWN private template when it has one, so a tenant
    // with a custom design (e.g. Laura's invoice) gets it pre-selected instead of
    // defaulting to the public catalog standard. Only kicks in for a tenant with no
    // default yet (this whole method is a no-op once a default exists).
    const owned = await this.prisma.receiptTemplateStandard.findFirst({
      where: { category, isActive: true, ownerCompanyProfileId: companyProfileId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    // Otherwise force a template the tenant can actually see (global or its own
    // private) — never a template private to a DIFFERENT tenant.
    const fallback =
      owned ??
      (await this.prisma.receiptTemplateStandard.findFirst({
        where: {
          category,
          isActive: true,
          ...this.visibleToTenant(companyProfileId),
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }));
    if (!fallback) return;
    await this.applyActive(companyProfileId, category, fallback);
  }

  // Provision-or-reuse the tenant's instance of `standard` and make it the sole
  // active default for the category (demote the rest). Shared by an explicit
  // selection (setActive) and the invariant self-heal (ensureActive).
  private async applyActive(
    companyProfileId: string,
    category: TemplateCategory,
    standard: ReceiptTemplateStandard,
  ): Promise<void> {
    const instance = await this.provisionInstance(companyProfileId, standard);

    await this.prisma.$transaction(async (tx) => {
      // Demote every current default in this category for the tenant.
      await tx.companyTemplate.updateMany({
        where: { companyProfileId, category, isDefault: true },
        data: { isDefault: false },
      });
      // Promote (or create) the row pointing at the chosen instance.
      const existing = await tx.companyTemplate.findFirst({
        where: { companyProfileId, category, receiptTemplateId: instance.id },
      });
      if (existing) {
        await tx.companyTemplate.update({
          where: { id: existing.id },
          data: { isDefault: true, isActive: true },
        });
      } else {
        await tx.companyTemplate.create({
          data: {
            companyProfileId,
            category,
            receiptTemplateId: instance.id,
            isDefault: true,
            isActive: true,
          },
        });
      }
    });
  }

  // Reuse the tenant's existing instance of this standard if one exists (a tenant
  // never needs two instances of the same design); otherwise clone a fresh
  // per-tenant ReceiptTemplate from the catalog standard.
  private async provisionInstance(
    companyProfileId: string,
    standard: ReceiptTemplateStandard,
  ) {
    const existing = await this.prisma.receiptTemplate.findFirst({
      where: { companyProfileId, standardId: standard.id },
    });
    if (existing) {
      if (!existing.isActive) {
        return this.prisma.receiptTemplate.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return existing;
    }
    return this.prisma.receiptTemplate.create({
      data: {
        companyProfileId,
        name: standard.name,
        basePdfPath: standard.basePdfPath,
        pageWidth: standard.pageWidth,
        pageHeight: standard.pageHeight,
        mediaBoxOffsetY: standard.mediaBoxOffsetY,
        fieldMappingJson: standard.fieldMappingJson as Prisma.InputJsonValue,
        numberFormat: standard.numberFormat,
        category: standard.category,
        documentTypeId: standard.documentTypeId,
        standardId: standard.id,
        isActive: true,
      },
    });
  }
}
