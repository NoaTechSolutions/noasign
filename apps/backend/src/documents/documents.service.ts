import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  DocumentFileType,
  DocumentStatus,
  Prisma,
  StorageProvider,
  TemplateCategory,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import type { WebhookEventPayload } from 'resend';
import { EmailService } from '../email/email.service';
import { R2Service } from '../storage/r2.service';
import { PrismaService } from '../prisma/prisma.service';
import { SignatureProviderService } from '../signature-provider/signature-provider.service';
import { CreateDraftDocumentDto } from './dto/create-draft-document.dto';
import { UpdateDraftDocumentDto } from './dto/update-draft-document.dto';
import {
  formatCooldownRemaining as formatCooldownRemainingMs,
  getResendAvailableAt as computeResendAvailableAt,
  getResendCooldownRemainingMs as computeResendCooldownRemainingMs,
  normalizeEmail as normalizeEmailValue,
} from '../common/resend-cooldown';
import { evaluateReceiptResend } from '../common/receipt-resend-policy';

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

type SigningProxyTokenPayload = {
  v: 1;
  p: 'sign-proxy';
  documentId: string;
  signerEmail: string;
  exp: number;
};

const documentDetailInclude = {
  documentType: true,
  formDefinition: true,
  signatureTemplate: true,
  data: true,
  customer: true,
  companyProfile: true,
  // select (not `true`) so the password hash never reaches the serialized detail.
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  // Receipt reissue (2c) traceability: the original this one corrects, and the
  // receipt(s) that superseded this one. Lightweight selects (id + number).
  supersedes: { select: { id: true, documentNumber: true } },
  supersededBy: { select: { id: true, documentNumber: true } },
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

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignatureProviderService))
    private readonly signatureProviderService: SignatureProviderService,
    private readonly emailService: EmailService,
    private readonly r2: R2Service,
  ) {}

  // Deterministic R2 object key for a contract's signed PDF (one per document).
  private contractR2Key(
    companyProfileId: string | null,
    documentId: string,
  ): string {
    return `signed/${companyProfileId ?? 'no-tenant'}/${documentId}.pdf`;
  }

  /**
   * Ensure the signed PDF is cached in R2 and return its object key (or null if
   * R2 is disabled / the doc has no provider id). Downloads from BoldSign only
   * once (first call) — subsequent calls reuse the stored DocumentFile. Used by
   * the COMPLETED sync (eager warm) and streamFinalPdf (lazy on-read + backfill).
   */
  private async ensureContractPdfInR2(document: {
    id: string;
    companyProfileId: string | null;
    providerDocumentId: string | null;
    documentNumber: string;
  }): Promise<string | null> {
    if (!this.r2.isConfigured() || !document.providerDocumentId) {
      return null;
    }
    const existing = await this.prisma.documentFile.findFirst({
      where: { documentId: document.id, fileType: DocumentFileType.SIGNED_PDF },
    });
    if (existing) {
      return existing.storageUrl;
    }
    const key = this.contractR2Key(document.companyProfileId, document.id);
    const pdf = await this.signatureProviderService.downloadDocumentPdf(
      document.providerDocumentId,
    );
    await this.r2.putObject(key, pdf.buffer, pdf.contentType ?? 'application/pdf');
    await this.prisma.documentFile.create({
      data: {
        documentId: document.id,
        fileType: DocumentFileType.SIGNED_PDF,
        provider: StorageProvider.R2,
        storageUrl: key,
        fileName: `${document.documentNumber}.pdf`,
        mimeType: 'application/pdf',
      },
    });
    return key;
  }

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

    // Receipt resend policy v2 — live countdown / "limit reached" for receipts.
    // Contracts keep the 24h fields above, untouched (this is null for them).
    const receiptResend = this.buildReceiptResendState(document, now);

    // M1: when versions are loaded (detail only), annotate each with the list of
    // human-readable fields that changed vs the previous version. Computed on the
    // fly from the stored snapshots — no migration, so old edits get it too.
    const versionsWithChanges = Array.isArray(document.versions)
      ? this.annotateVersionChanges(
          document.versions,
          document.formDefinition?.schemaJson,
        )
      : document.versions;

    return {
      ...document,
      versions: versionsWithChanges,
      receiptResend,
      providerDocumentId: document.providerDocumentId ?? null,
      providerStatus: document.providerStatus ?? null,
      providerLastSyncedAt: document.providerLastSyncedAt ?? null,
      lastManualReminderAt: document.lastManualReminderAt ?? null,
      lastSentRecipientEmail: document.lastSentRecipientEmail ?? null,
      // B7: exposed so a SUPERADMIN's list can badge a soft-deleted doc.
      deletedAt: document.deletedAt ?? null,
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

  // ── M1: per-edit "what changed" for the version timeline ──────────────────
  // Each edit already stores a full snapshotJson; we diff consecutive snapshots
  // on the fly and attach the changed field LABELS to each version. Generic for
  // all document types (contract/invoice/receipt) — the timeline UI lights it up
  // wherever it renders. Trivial auto-format-only diffs (case/whitespace/currency
  // formatting) are filtered; finance_* fields collapse to one "Finance" entry.
  private annotateVersionChanges(
    versions: Array<Record<string, any>>,
    schemaJson: unknown,
  ): Array<Record<string, any>> {
    const labels = this.buildSchemaLabelMap(schemaJson);
    // Work in ascending order so each version diffs against its predecessor.
    const asc = [...versions].sort(
      (a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0),
    );
    const changesById = new Map<string, string[]>();
    for (let i = 0; i < asc.length; i++) {
      if (i === 0) {
        changesById.set(asc[i].id, []); // v1 is the creation — nothing "changed"
        continue;
      }
      changesById.set(
        asc[i].id,
        this.diffSnapshots(
          this.asRecord(asc[i - 1].snapshotJson),
          this.asRecord(asc[i].snapshotJson),
          labels,
        ),
      );
    }
    // Preserve the incoming order; drop the raw snapshot from the response.
    return versions.map((v) => {
      const { snapshotJson: _snapshot, ...rest } = v;
      return { ...rest, changedFields: changesById.get(v.id) ?? [] };
    });
  }

  private buildSchemaLabelMap(schemaJson: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    const sections = (schemaJson as { sections?: unknown })?.sections;
    if (Array.isArray(sections)) {
      for (const section of sections) {
        const fields = (section as { fields?: unknown })?.fields;
        if (Array.isArray(fields)) {
          for (const f of fields) {
            const key = (f as { key?: unknown })?.key;
            const label = (f as { label?: unknown })?.label;
            if (typeof key === 'string' && typeof label === 'string') {
              out[key] = label;
            }
          }
        }
      }
    }
    return out;
  }

  private diffSnapshots(
    prev: Record<string, unknown>,
    curr: Record<string, unknown>,
    labels: Record<string, string>,
  ): string[] {
    const changed: string[] = [];
    let financeChanged = false;
    const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    for (const key of keys) {
      if (this.normalizeForCompare(prev[key]) === this.normalizeForCompare(curr[key])) {
        continue; // equal after normalization → no real (non-format) change
      }
      // Finance N + the finance charge collapse to a single group entry.
      if (key === 'finance_charge' || /^finance_\d+_/.test(key)) {
        financeChanged = true;
        continue;
      }
      changed.push(labels[key] ?? this.humanizeKey(key));
    }
    if (financeChanged) changed.push('Finance');
    return changed;
  }

  // Normalize a value so ONLY auto-format differences (case, surrounding/duplicate
  // whitespace, currency/number formatting) collapse to equality. Any real content
  // change (different characters/digits) survives — a legitimate edit is never eaten.
  private normalizeForCompare(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    const s = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
    const numeric = s.replace(/[$,\s]/g, '');
    if (numeric !== '' && /^-?\d*\.?\d+$/.test(numeric)) {
      return String(parseFloat(numeric)); // "12000" === "12,000.00" === "$12000.0"
    }
    return s;
  }

  private humanizeKey(key: string): string {
    // Fallback label for a field the schema doesn't name — never a raw id.
    const words = key.replace(/[_-]+/g, ' ').trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  // Receipt-only: evaluate the resend policy v2 for the UI's countdown / limit.
  // Returns null for contracts (and for non-receipts), leaving them untouched.
  private buildReceiptResendState(
    document: {
      documentType?: { code?: string | null } | null;
      data?: { dataJson?: unknown } | null;
      sendCount?: number | null;
      lastAttemptAt?: Date | string | null;
      lastSentRecipientEmail?: string | null;
    },
    now: Date,
  ): {
    canResend: boolean;
    retryAfterSeconds: number;
    limitReached: boolean;
  } | null {
    if (document.documentType?.code !== 'PAYMENT_RECEIPT') {
      return null;
    }
    const dataJson = document.data?.dataJson;
    const currentEmail =
      dataJson &&
      typeof dataJson === 'object' &&
      !Array.isArray(dataJson) &&
      typeof (dataJson as Record<string, unknown>).email === 'string'
        ? ((dataJson as Record<string, unknown>).email as string)
        : '';
    const decision = evaluateReceiptResend({
      sendCount: typeof document.sendCount === 'number' ? document.sendCount : 0,
      lastAttemptAt: document.lastAttemptAt ?? null,
      lastEmail: document.lastSentRecipientEmail ?? null,
      currentEmail,
      now,
    });
    if (decision.allowed) {
      return { canResend: true, retryAfterSeconds: 0, limitReached: false };
    }
    if (decision.reason === 'hard-cap') {
      return { canResend: false, retryAfterSeconds: 0, limitReached: true };
    }
    return {
      canResend: false,
      retryAfterSeconds: Math.ceil(decision.retryAfterMs / 1000),
      limitReached: false,
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

    // B7 soft-delete: a normal user never resolves a deleted document — not in
    // the list, not in detail, not for any action (the scope is reused across
    // every read). A SUPERADMIN sees the whole tenant INCLUDING deleted docs
    // (rendered with a "Deleted" badge), so no deletedAt filter for them.
    return user.role === 'SUPERADMIN'
      ? { companyProfileId: user.companyProfileId }
      : { userId: user.id, deletedAt: null };
  }

  private isResendEligibleStatus(status?: string | null) {
    return status === DocumentStatus.SENT || status === DocumentStatus.VIEWED;
  }

  private getResendAvailableAt(lastManualReminderAt?: Date | string | null) {
    return computeResendAvailableAt(lastManualReminderAt ?? null);
  }

  private getResendCooldownRemainingMs(
    document: { lastManualReminderAt?: Date | string | null },
    now = new Date(),
  ) {
    return computeResendCooldownRemainingMs(
      document.lastManualReminderAt ?? null,
      now,
    );
  }

  private normalizeEmail(value?: string | null) {
    return normalizeEmailValue(value ?? null);
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
    return formatCooldownRemainingMs(remainingMs);
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

  // Superadmin flow: list EVERY user across ALL tenants so a SUPERADMIN can pick
  // whose forms/templates to borrow. Gated to SUPERADMIN (tightens to a real
  // superadmin role with the parked refactor).
  async getSelectableUsers(userId: string) {
    const caller = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!caller) throw new NotFoundException('User not found');
    if (caller.role !== 'SUPERADMIN') {
      throw new ForbiddenException(
        'Only master users can list users across tenants',
      );
    }
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        companyProfile: { select: { companyName: true } },
      },
      orderBy: { email: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      email: u.email,
      role: u.role,
      companyName: u.companyProfile?.companyName ?? null,
    }));
  }

  async getDocumentTypes(userId: string, asUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyProfileId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // NOA-238 — master may pass ?asUserId=<id> to see the catalog as the
    // target user would. Validates the target lives in the same tenant
    // before swapping perspective.
    let effectiveUserId = userId;
    let effectiveRole = user.role;
    let effectiveCompanyProfileId = user.companyProfileId;
    if (asUserId && asUserId !== userId) {
      if (user.role !== 'SUPERADMIN') {
        throw new ForbiddenException(
          'Only master users can request templates as another user',
        );
      }
      // Superadmin flow: a SUPERADMIN may select a user in ANY tenant to borrow their
      // forms/templates (the document still becomes the master's, with the
      // master's correlativo). Gated to SUPERADMIN — tightens to a superadmin role
      // with the parked refactor.
      const target = await this.prisma.user.findUnique({
        where: { id: asUserId },
        select: { id: true, role: true, companyProfileId: true },
      });
      if (!target) {
        throw new BadRequestException('Target user not found');
      }
      effectiveUserId = target.id;
      effectiveRole = target.role;
      effectiveCompanyProfileId = target.companyProfileId;
    }

    if (effectiveRole === 'SUPERADMIN') {
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

    const configs = await this.prisma.userDocumentConfig.findMany({
      where: { userId: effectiveUserId, isActive: true },
      include: {
        documentType: true,
        formDefinition: true,
        signatureTemplate: true,
      },
    });

    // Model C — a RECEIPTS_ONLY tenant (contractsEnabled=false) cannot use
    // BoldSign/contract types; only receipts (added further down). Masters are
    // cross-tenant superadmins and exit via the early return above, so this
    // only affects regular tenant users.
    const tenantContractsEnabled = effectiveCompanyProfileId
      ? (
          await this.prisma.companyProfile.findUnique({
            where: { id: effectiveCompanyProfileId },
            select: { contractsEnabled: true },
          })
        )?.contractsEnabled ?? true
      : true;

    const typeMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        generationMode: string;
        formDefinitions: Array<{
          id: string;
          name: string;
          schemaJson: unknown;
        }>;
        signatureTemplates: Array<{
          id: string;
          name: string;
          providerTemplateId: string | null;
        }>;
        receiptTemplateId?: string;
        // True when the active receipt template can draw the "N of M" multi-
        // payment field (fieldMappingJson has `payment_n`) — e.g. the WorldPavers
        // custom template. Gates the "part of multiple payments" toggle.
        receiptTemplateSupportsMultiPayment?: boolean;
      }
    >();

    for (const config of configs) {
      if (
        !config.formDefinition.isActive ||
        !config.signatureTemplate.isActive
      ) {
        continue;
      }

      // RECEIPTS_ONLY: hide contract (BoldSign) types.
      if (
        !tenantContractsEnabled &&
        config.documentType.generationMode === 'BOLDSIGN'
      ) {
        continue;
      }

      const existing = typeMap.get(config.documentTypeId);

      if (!existing) {
        typeMap.set(config.documentTypeId, {
          id: config.documentType.id,
          name: config.documentType.name,
          code: config.documentType.code,
          generationMode: config.documentType.generationMode,
          formDefinitions: [
            {
              id: config.formDefinition.id,
              name: config.formDefinition.name,
              schemaJson: config.formDefinition.schemaJson,
            },
          ],
          signatureTemplates: [
            {
              id: config.signatureTemplate.id,
              name: config.signatureTemplate.name,
              providerTemplateId: config.signatureTemplate.providerTemplateId,
            },
          ],
        });
      } else {
        if (
          !existing.formDefinitions.some(
            (fd) => fd.id === config.formDefinition.id,
          )
        ) {
          existing.formDefinitions.push({
            id: config.formDefinition.id,
            name: config.formDefinition.name,
            schemaJson: config.formDefinition.schemaJson,
          });
        }
        if (
          !existing.signatureTemplates.some(
            (st) => st.id === config.signatureTemplate.id,
          )
        ) {
          existing.signatureTemplates.push({
            id: config.signatureTemplate.id,
            name: config.signatureTemplate.name,
            providerTemplateId: config.signatureTemplate.providerTemplateId,
          });
        }
      }
    }

    // Receipts (DIRECT_PDF) are available company-wide: any non-master user
    // whose company has an active ReceiptTemplate can create them — no per-user
    // UserDocumentConfig is needed (unlike BoldSign types).
    if (effectiveCompanyProfileId) {
      const receiptTemplates = await this.prisma.receiptTemplate.findMany({
        where: { companyProfileId: effectiveCompanyProfileId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, fieldMappingJson: true },
      });
      if (receiptTemplates.length > 0) {
        // The active template drives the "N of M" multi-payment field only when
        // its mapping draws it (payment_n) — WorldPavers' custom template does,
        // the catalog templates don't.
        const activeMapping = (receiptTemplates[0].fieldMappingJson ??
          {}) as Record<string, unknown>;
        const supportsMultiPayment = 'payment_n' in activeMapping;
        const directTypes = await this.prisma.documentType.findMany({
          where: { generationMode: 'DIRECT_PDF' },
          include: {
            formDefinitions: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        });
        // L3: the INVOICE form is derived from the tenant's OWN active invoice
        // template (its standard's formDefinition), NOT from a global form —
        // that global lookup leaked another tenant's private invoice form. A
        // tenant with no invoice template gets NO form, so the INVOICE type is
        // not offered at all (owner decision) until it has its own template.
        const invoiceTemplate = await this.prisma.receiptTemplate.findFirst({
          where: {
            companyProfileId: effectiveCompanyProfileId,
            category: TemplateCategory.INVOICE,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
          include: { standard: { include: { formDefinition: true } } },
        });
        const invoiceForm = invoiceTemplate?.standard?.formDefinition ?? null;
        for (const dt of directTypes) {
          if (typeMap.has(dt.id)) continue;
          const isInvoiceType = dt.code === 'INVOICE';
          // No own invoice template (or it has no form) → don't offer INVOICE.
          if (isInvoiceType && !invoiceForm) continue;
          const formDefinitions =
            isInvoiceType && invoiceForm
              ? [
                  {
                    id: invoiceForm.id,
                    name: invoiceForm.name,
                    schemaJson: invoiceForm.schemaJson,
                  },
                ]
              : dt.formDefinitions.map((fd) => ({
                  id: fd.id,
                  name: fd.name,
                  schemaJson: fd.schemaJson,
                }));
          typeMap.set(dt.id, {
            id: dt.id,
            name: dt.name,
            code: dt.code,
            generationMode: dt.generationMode,
            formDefinitions,
            signatureTemplates: [],
            // The (effective user's) tenant template to borrow — the frontend
            // passes it to createReceipt for the superadmin flow. Invoices point
            // at their own resolved template.
            receiptTemplateId:
              isInvoiceType && invoiceTemplate
                ? invoiceTemplate.id
                : receiptTemplates[0].id,
            receiptTemplateSupportsMultiPayment: supportsMultiPayment,
          });
        }
      }
    }

    return Array.from(typeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private async generateDocumentNumber(
    documentTypeId: string,
    userId: string,
  ): Promise<string> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    // Correlativo is PER USER, from an atomic per-(user, type) sequence: each user
    // numbers their own documents from 000001 — a master creating with another
    // user's global form gets a number from THEIR OWN sequence. Replaces an O(n)
    // max-in-memory scan that also raced under concurrency against the composite
    // @@unique([userId, documentTypeId, documentNumber]). Backfilled continuity —
    // migration 20260706150000 (non-numeric formats like SEED-… were ignored then
    // and are excluded from the backfill max the same way).
    const counter = await this.prisma.$transaction((tx) =>
      tx.userDocumentSequence.upsert({
        where: { userId_documentTypeId: { userId, documentTypeId } },
        create: { userId, documentTypeId, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      }),
    );
    return `${documentType.code}-${String(counter.lastNumber).padStart(6, '0')}`;
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

    // Model C — RECEIPTS_ONLY tenants (contractsEnabled=false) cannot create
    // contracts. Masters are cross-tenant superadmins and bypass this.
    if (
      user.role !== 'SUPERADMIN' &&
      documentType.generationMode === 'BOLDSIGN' &&
      user.companyProfile?.contractsEnabled === false
    ) {
      throw new ForbiddenException(
        'Your plan does not include contracts.',
      );
    }

    // If caller linked a customer, verify it belongs to this tenant before
    // writing the FK. Unknown or cross-tenant ids → 404 so we never leak
    // existence across companies.
    if (body.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: body.customerId,
          companyProfileId: user.companyProfileId,
        },
        select: { id: true },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // NOA-238 — master may assign the draft to another tenant user. The
    // resulting Document.userId controls visibility under the per-user
    // scope at getDocumentAccessScope, so this is effectively "create on
    // behalf of <user>". Non-master attempts to override are rejected.
    let ownerUserId: string = user.id;
    if (body.userId && body.userId !== user.id) {
      if (user.role !== 'SUPERADMIN') {
        throw new ForbiddenException(
          'Only master users can create documents on behalf of another user',
        );
      }
      const target = await this.prisma.user.findFirst({
        where: { id: body.userId, companyProfileId: user.companyProfileId },
        select: { id: true },
      });
      if (!target) {
        throw new BadRequestException(
          'Target user not found in the current tenant',
        );
      }
      ownerUserId = target.id;
    }

    const document = await this.prisma.document.create({
      data: {
        documentNumber: await this.generateDocumentNumber(
          body.documentTypeId,
          ownerUserId,
        ),
        userId: ownerUserId,
        companyProfileId: user.companyProfileId,
        customerId: body.customerId ?? null,
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
        // J4: stamp the edit so the contract timeline shows an "Edited" event
        // (receipts/invoices already set this on their own edit paths).
        lastEditedAt: new Date(),
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

    const { completionUrl: baseCompletionUrl, signingProxyUrl } =
      this.buildPublicSignatureLinks(documentId, recipient.email);
    const completionUrl = `${baseCompletionUrl}&email=${encodeURIComponent(recipient.email)}`;

    if (!providerDocumentId) {
      const senderRecipient = this.buildSenderSignatureRecipient(document);
      const fallbackFields = this.buildFallbackScalarMap(context);
      const createdDocument =
        await this.signatureProviderService.createDocumentFromTemplate({
          name: this.buildSignatureDocumentName(document),
          templateId: document.signatureTemplate.providerTemplateId,
          recipients: [recipient],
          senderRecipient,
          subject,
          message,
          signerRedirectUrl: completionUrl,
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

    // FASE 2: Resend message id of the invitation, captured so a later async
    // bounce webhook can correlate the bounce back to this contract. Email
    // failure is non-fatal (doc is already sent in BoldSign), so it stays null.
    let providerEmailId: string | null = null;

    // Fetch the signer's signing link from BoldSign and send our own email
    try {
      // Use signing proxy URL so re-clicks after signing redirect to success page
      let emailSigningUrl = signingProxyUrl;
      if (!emailSigningUrl) {
        emailSigningUrl = await this.signatureProviderService.getSigningLink(
          providerDocumentId,
          recipient.email,
          completionUrl,
        );
      }
      const { id } = await this.emailService.sendSigningInvitation({
        to: recipient.email,
        signerName: this.buildPublicSignerName(document),
        senderName: this.buildPublicSenderName(document),
        senderCompany:
          document.companyProfile?.companyName ??
          document.companyProfile?.legalName ??
          'NTSsign',
        documentName: document.documentType?.name ?? document.documentNumber,
        documentNumber: document.documentNumber,
        signingUrl: emailSigningUrl,
      });
      providerEmailId = id || null;
    } catch (emailError) {
      this.logger.error(
        `[sendDraftDocument] Email sending failed for document ${documentId}: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
      );
      // Do not throw — document is already sent in BoldSign, email failure is non-fatal
    }

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
        providerEmailId,
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

  /**
   * Handle a verified Resend webhook event (FASE 2: async bounce detection).
   *
   * Resend accepts a send synchronously (returns an id, looks SENT) but a hard
   * bounce arrives minutes later as a webhook. We only act on a PERMANENT
   * bounce — flip the matching document to SEND_FAILED with a human-readable
   * reason so receipts AND contracts show the truth instead of a phantom SENT.
   * Transient (soft) bounces are retried by Resend, so we ignore them. Spam
   * complaints are logged softly (reputation signal, no status change). Unknown
   * events and unmatched ids are benign no-ops (we still ack with 200).
   */
  async handleResendWebhook(event: WebhookEventPayload): Promise<void> {
    if (event.type === 'email.bounced') {
      const emailId = event.data.email_id;
      const bounceType = event.data.bounce?.type ?? '';
      const bounceMessage = event.data.bounce?.message ?? 'Email bounced';

      // Only PERMANENT (hard) bounces are terminal. Transient = Resend retries.
      if (bounceType.toLowerCase() !== 'permanent') {
        this.logger.log(
          `[ResendWebhook] Ignoring non-permanent bounce (${bounceType}) for email ${emailId}`,
        );
        return;
      }

      if (!emailId) {
        return;
      }

      const document = await this.prisma.document.findFirst({
        where: { providerEmailId: emailId },
      });

      if (!document) {
        // Foreign id — e.g. cross-talk from a shared Resend account, or an old
        // send whose id was overwritten by a resend. Benign no-op.
        this.logger.warn(
          `[ResendWebhook] Permanent bounce for unknown email id ${emailId} — no matching document`,
        );
        return;
      }

      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.SEND_FAILED,
          sendError: `Bounced: ${bounceMessage}`,
        },
      });

      this.logger.warn(
        `[ResendWebhook] Document ${document.id} marked SEND_FAILED — permanent bounce: ${bounceMessage}`,
      );
      return;
    }

    if (event.type === 'email.complained') {
      this.logger.warn(
        `[ResendWebhook] Spam complaint for email id ${event.data.email_id} — logged for reputation (no status change)`,
      );
      return;
    }

    // Any other event type → ack as a no-op.
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
      document.status !== DocumentStatus.VIEWED &&
      document.status !== DocumentStatus.SEND_FAILED
    ) {
      throw new BadRequestException(
        'Only draft, sent, viewed or failed documents can be cancelled',
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

  // B7 soft-delete: a DRAFT is deleted (soft), never voided. Void stays for
  // issued (SENT) receipts/invoices. Stamps deletedAt so the owner stops seeing
  // it while a SUPERADMIN still can (see getDocumentAccessScope). No restore here
  // — that's a future feature (F1).
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const scope = await this.getDocumentAccessScope(userId);

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...scope },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be deleted');
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
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

    // Dev/test bypass: documents seeded with a 'test-pdf*' provider id have no
    // real BoldSign document. Stream a self-generated sample PDF (no external
    // dependency) so the preview/download UI can be exercised end-to-end. Never
    // fires for real documents — their provider ids are BoldSign UUIDs.
    if (document.providerDocumentId.startsWith('test-pdf')) {
      const customerName =
        document.customer?.fullName ?? document.customer?.email ?? 'N/A';
      const buffer = buildSampleSignedPdf([
        'SAMPLE SIGNED DOCUMENT',
        '',
        `Document: ${document.documentNumber}`,
        `Customer: ${customerName}`,
        `Status:   ${document.status}`,
        '',
        'This is a generated test PDF (no real BoldSign document).',
      ]);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${document.documentNumber}.pdf"`,
      );
      res.send(buffer);
      return;
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

    const safeFileName = `${document.documentNumber}.pdf`;

    // With R2: cache the signed PDF (lazy backfill for pre-R2 docs) and stream
    // the bytes through the backend (same-origin). NOT a 302 to a presigned R2
    // URL — R2 sends no CORS headers, so the in-app viewer's blob fetch that
    // follows the redirect is blocked → blank PDF.
    if (this.r2.isConfigured()) {
      const key = await this.ensureContractPdfInR2({
        id: document.id,
        companyProfileId: document.companyProfileId,
        providerDocumentId: document.providerDocumentId,
        documentNumber: document.documentNumber,
      });
      if (key) {
        const buffer = await this.r2.getObject(key);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${safeFileName}"`,
        );
        res.send(buffer);
        return;
      }
    }

    // Fallback (R2 disabled): stream straight from BoldSign (legacy).
    const pdf = await this.signatureProviderService.downloadDocumentPdf(
      document.providerDocumentId,
    );
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
      include: { companyProfile: true, documentType: true },
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

    // Eagerly cache the signed PDF in R2 (best-effort, non-blocking). Lazy
    // on-read (streamFinalPdf) is the safety net if this is skipped or fails.
    void this.ensureContractPdfInR2({
      id: document.id,
      companyProfileId: document.companyProfileId,
      providerDocumentId: document.providerDocumentId,
      documentNumber: document.documentNumber,
    }).catch((err) =>
      this.logger.warn(
        `[R2] Eager signed-PDF cache failed for ${document.id}: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );

    // Send confirmation email to the signer with the signed PDF attached.
    // If BoldSign hasn't generated the PDF yet after all retries, send a
    // "your copy is on its way" email instead — never send without the attachment.
    const signerEmail = document.lastSentRecipientEmail;
    if (signerEmail) {
      const emailPayload = {
        to: signerEmail,
        signerName: this.buildPublicSignerName(document as PublicDocument),
        senderCompany:
          document.companyProfile?.companyName ??
          document.companyProfile?.legalName ??
          'NTSsign',
        documentName: document.documentType?.name ?? document.documentNumber,
        documentNumber: document.documentNumber,
      };

      try {
        const pdfBuffer = document.providerDocumentId
          ? await this.downloadPdfWithRetry(
              document.id,
              document.providerDocumentId,
            )
          : null;

        if (pdfBuffer) {
          await this.emailService.sendSignedConfirmation({
            ...emailPayload,
            pdfBuffer,
          });
        } else {
          await this.emailService.sendSignatureProcessing(emailPayload);
        }
      } catch (emailErr) {
        this.logger.error(
          `[syncDocumentToCompleted] Failed to send email for document ${document.id}: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`,
        );
        // non-fatal — document is already marked completed
      }
    }
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Tries to download the signed PDF from BoldSign.
   * BoldSign fires the webhook immediately but generates the signed PDF asynchronously,
   * so the first attempt may fail. We retry up to `retries` times with `delayMs` between
   * each attempt (no delay before the very first try).
   *
   * Returns the PDF buffer on success, or null if all attempts are exhausted.
   * The caller decides what email to send based on the result.
   */
  private async downloadPdfWithRetry(
    documentId: string,
    providerDocumentId: string,
    retries = 8,
    delayMs = 15_000,
  ): Promise<Buffer | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) {
        // No delay before the first attempt — BoldSign sometimes has the PDF ready immediately
        await this.sleep(delayMs);
      }
      try {
        const pdf =
          await this.signatureProviderService.downloadDocumentPdf(
            providerDocumentId,
          );
        this.logger.log(
          `[syncDocumentToCompleted] PDF ready on attempt ${attempt + 1}/${retries} for document ${documentId}`,
        );
        return pdf.buffer;
      } catch (err) {
        this.logger.warn(
          `[syncDocumentToCompleted] PDF download attempt ${attempt + 1}/${retries} failed for document ${documentId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    this.logger.error(
      `[syncDocumentToCompleted] PDF not available after ${retries} attempts (~${Math.round(((retries - 1) * delayMs) / 1000)}s) for document ${documentId}`,
    );
    return null;
  }

  private buildPublicSignatureLinks(documentId: string, signerEmail?: string) {
    const { token, expiresAt } = this.createPublicSignatureToken(documentId);
    const appBaseUrl = this.getAppUrl();
    const backendBaseUrl = this.getBackendUrl();

    const proxyToken = signerEmail
      ? this.createSigningProxyToken(documentId, signerEmail)
      : null;

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      completionUrl: `${appBaseUrl}/signature-complete?token=${encodeURIComponent(token)}`,
      signingProxyUrl: proxyToken
        ? `${backendBaseUrl}/public/signatures/proxy/${encodeURIComponent(proxyToken)}`
        : null,
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

  private createSigningProxyToken(
    documentId: string,
    signerEmail: string,
  ): string {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
    const payload: SigningProxyTokenPayload = {
      v: 1,
      p: 'sign-proxy',
      documentId,
      signerEmail,
      exp,
    };
    const encodedPayload = Buffer.from(
      JSON.stringify(payload),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', this.getPublicSignatureSecret())
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  async resolveSigningRedirect(proxyToken: string): Promise<string> {
    const [encodedPayload, receivedSignature] = proxyToken
      .trim()
      .split('.', 2)
      .filter(Boolean);
    if (!encodedPayload || !receivedSignature) {
      throw new BadRequestException('Invalid signing proxy token');
    }
    const expectedSignature = createHmac(
      'sha256',
      this.getPublicSignatureSecret(),
    )
      .update(encodedPayload)
      .digest('base64url');
    if (!this.safeCompare(expectedSignature, receivedSignature)) {
      throw new BadRequestException('Invalid signing proxy token');
    }
    let payload: SigningProxyTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as SigningProxyTokenPayload;
    } catch {
      throw new BadRequestException('Invalid signing proxy token');
    }
    if (
      payload.v !== 1 ||
      payload.p !== 'sign-proxy' ||
      !payload.documentId ||
      !payload.signerEmail
    ) {
      throw new BadRequestException('Invalid signing proxy token');
    }
    if (payload.exp * 1000 <= Date.now()) {
      throw new BadRequestException('Signing link has expired');
    }

    const document = await this.prisma.document.findUnique({
      where: { id: payload.documentId },
    });
    const appUrl = this.getAppUrl();
    const emailParam = `email=${encodeURIComponent(payload.signerEmail)}`;

    const terminalStatuses: DocumentStatus[] = [
      DocumentStatus.COMPLETED,
      DocumentStatus.SIGNED,
      DocumentStatus.CANCELLED,
    ];
    if (!document || terminalStatuses.includes(document.status)) {
      return `${appUrl}/signature-complete?${emailParam}`;
    }

    if (!document.providerDocumentId) {
      return `${appUrl}/signature-complete?${emailParam}`;
    }

    const { completionUrl: baseCompletionUrl } = this.buildPublicSignatureLinks(
      payload.documentId,
    );
    const completionUrl = `${baseCompletionUrl}&${emailParam}`;

    const signingLink = await this.signatureProviderService.getSigningLink(
      document.providerDocumentId,
      payload.signerEmail,
      completionUrl,
    );
    return signingLink;
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
      role: document.signatureTemplate?.recipientRole || 'BUYER',
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
      [
        'document.draft',
        'document.uploaded',
        'draft',
        'draftcreated',
        'documentcreated', // BoldSign webhook
      ].includes(normalized)
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
        'documentsent', // BoldSign webhook
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
        'documentviewed', // BoldSign webhook
      ].includes(normalized)
    ) {
      return 'viewed';
    }

    if (
      [
        'document.signed',
        'signed',
        'signature_request_signed',
        'documentsigned', // BoldSign webhook
      ].includes(normalized)
    ) {
      return 'signed';
    }

    if (
      [
        'document.completed',
        'completed',
        'signature_request_all_signed',
        'signature_request_downloadable',
        'documentcompleted', // BoldSign webhook
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
        'documentdeclined', // BoldSign webhook
        'documentexpired', // BoldSign webhook
        'documentrevoked', // BoldSign webhook
        'documentreassigned', // BoldSign webhook
      ].includes(normalized)
    ) {
      return 'cancelled';
    }

    if (
      [
        'deliveryfailed',
        'editfailed',
        'needattention',
        'needtoattention', // BoldSign webhook
      ].includes(normalized)
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
        insuranceName: document.companyProfile?.insuranceName ?? '',
        insurancePhone: document.companyProfile?.insurancePhone ?? '',
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
    // Project address combined — the BoldSign template exposes a single
    // `project_city_state_zip` field (the form keeps city/state/zip separate),
    // mirroring the customer_city_state_zip derivation above.
    const projectCityStateZip = this.formatCityStateZip(
      this.readScalarString(context.data.project_city),
      this.readScalarString(context.data.project_state),
      this.readScalarString(context.data.project_zip),
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
    // Insurance (from CompanyProfile) — matches the template's insurance fields.
    this.assignScalarValue(
      fallback,
      'insurance_name',
      context.company.insuranceName,
    );
    this.assignScalarValue(
      fallback,
      'insurance_phone',
      context.company.insurancePhone,
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
    // Director aliases (primary contact) — matches BoldSign template token names
    this.assignScalarValue(fallback, 'director_name', contactFullName);
    this.assignScalarValue(fallback, 'director_email', context.contact.email);
    this.assignScalarValue(fallback, 'director_phone', context.contact.phone);
    this.assignScalarValue(
      fallback,
      'director_address',
      context.contact.addressLine1,
    );
    this.assignScalarValue(
      fallback,
      'director_contract_address',
      context.contact.addressLine1,
    );
    this.assignScalarValue(
      fallback,
      'director_city_state_zip',
      this.formatCityStateZip(
        context.contact.city,
        context.contact.state,
        context.contact.zipCode,
      ),
    );
    // license_number aliases (template may use any of these names)
    this.assignScalarValue(
      fallback,
      'license_number',
      context.company.licenseNumber,
    );
    this.assignScalarValue(
      fallback,
      'director_license_number',
      context.company.licenseNumber,
    );
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
    this.assignScalarValue(
      fallback,
      'project_city_state_zip',
      projectCityStateZip,
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

/**
 * Builds a minimal, valid single-page PDF with the given text lines. Offsets in
 * the xref table are computed from the actual byte positions (not hardcoded), so
 * the file is well-formed. Used only by the 'test-pdf*' dev bypass — no external
 * dependency, no PDF library needed.
 */
function buildSampleSignedPdf(lines: string[]): Buffer {
  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const content =
    lines
      .map(
        (line, i) =>
          `BT /F1 ${i === 0 ? 18 : 12} Tf 72 ${720 - i * 22} Td (${esc(line)}) Tj ET`,
      )
      .join('\n') + '\n';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, idx) => {
    offsets[idx] = Buffer.byteLength(body);
    body += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body + xref + trailer, 'latin1');
}
