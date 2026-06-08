import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentFileType,
  DocumentStatus,
  Prisma,
  StorageProvider,
} from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { R2Service } from '../storage/r2.service';
import { ReceiptPdfService, ReceiptTemplateLike } from './receipt-pdf.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { normalizeEmail } from '../common/resend-cooldown';
import {
  evaluateReceiptResend,
  nextSendCount,
  receiptResendBlockMessage,
} from '../common/receipt-resend-policy';

const RECEIPT_TYPE_CODE = 'PAYMENT_RECEIPT';

// Fields the generator draws onto the base PDF — shared shape between a fresh
// create (from the DTO) and a regenerate (from the stored dataJson).
interface ReceiptPdfSource {
  receipt_number: string;
  date: string;
  client: string;
  amount: number;
  payment_current?: number | null;
  payment_total?: number | null;
  payment_for?: string | null;
  received_by?: string | null;
  other_label?: string | null;
  payment_method: string;
}

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptPdf: ReceiptPdfService,
    private readonly email: EmailService,
    private readonly r2: R2Service,
  ) {}

  // Deterministic R2 object key for a receipt's PDF (one per document; a resend
  // or edit overwrites the same key so R2 always holds the current version).
  private receiptR2Key(companyProfileId: string, documentId: string): string {
    return `receipts/${companyProfileId}/${documentId}.pdf`;
  }

  // Upload the generated PDF to R2 and record it as a DocumentFile. No-op when
  // R2 is not configured (storage disabled) — the on-the-fly fallback still works.
  private async persistReceiptToR2(
    documentId: string,
    companyProfileId: string,
    buffer: Buffer,
    fileName: string,
  ): Promise<void> {
    if (!this.r2.isConfigured()) return;
    const key = this.receiptR2Key(companyProfileId, documentId);
    await this.r2.putObject(key, buffer, 'application/pdf');
    const existing = await this.prisma.documentFile.findFirst({
      where: { documentId, fileType: DocumentFileType.RECEIPT },
    });
    const data = {
      provider: StorageProvider.R2,
      storageUrl: key,
      fileName,
      mimeType: 'application/pdf',
    };
    if (existing) {
      await this.prisma.documentFile.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.documentFile.create({
        data: { documentId, fileType: DocumentFileType.RECEIPT, ...data },
      });
    }
  }

  /**
   * Generate a receipt PDF from the tenant's ReceiptTemplate, persist it as a
   * PAYMENT_RECEIPT Document, and (optionally) email it. Returns the document +
   * the correlative receipt number + the generated PDF buffer.
   */
  async createReceipt(userId: string, dto: CreateReceiptDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyProfileId) {
      throw new BadRequestException('User has no company profile');
    }
    const companyProfileId = user.companyProfileId;

    const docType = await this.prisma.documentType.findUnique({
      where: { code: RECEIPT_TYPE_CODE },
    });
    if (!docType) {
      throw new NotFoundException(
        `Document type ${RECEIPT_TYPE_CODE} not found — run the receipt seed`,
      );
    }
    const formDefinition = await this.prisma.formDefinition.findFirst({
      where: { documentTypeId: docType.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!formDefinition) {
      throw new NotFoundException('No active receipt form definition');
    }
    const template = await this.prisma.receiptTemplate.findFirst({
      where: { companyProfileId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) {
      throw new NotFoundException(
        'No receipt template configured for this company',
      );
    }

    const year = new Date().getFullYear();
    const receiptNumber = await this.nextReceiptNumber(
      companyProfileId,
      year,
      template.numberFormat,
    );

    // Data the generator draws onto the base PDF (keys match fieldMappingJson).
    const pdfData = this.buildPdfData({
      receipt_number: receiptNumber,
      date: dto.date,
      client: dto.client,
      amount: dto.amount,
      payment_current: dto.payment_current,
      payment_total: dto.payment_total,
      payment_for: dto.payment_for,
      received_by: dto.received_by,
      other_label: dto.other_label,
      payment_method: dto.payment_method,
    });

    // Stored record, keyed to MATCH the form schema so the detail view renders
    // every field. Empty optionals are '' (not undefined → dropped). `email`
    // mirrors recipientEmail (the schema field is `email`).
    const dataJson: Record<string, string | number> = {
      client: dto.client,
      email: dto.recipientEmail ?? '',
      amount: dto.amount,
      date: dto.date,
      payment_method: dto.payment_method,
      other_label: dto.other_label ?? '',
      payment_for: dto.payment_for ?? '',
      payment_current: dto.payment_current ?? 1,
      payment_total: dto.payment_total ?? 1,
      received_by: dto.received_by ?? '',
      phone: dto.phone ?? '',
      receipt_number: receiptNumber,
    };

    const pdfBuffer = await this.receiptPdf.generate(
      template as unknown as ReceiptTemplateLike,
      pdfData,
    );

    const send = dto.send === true;
    const documentNumber = await this.generateReceiptDocumentNumber(
      docType.id,
      docType.code,
    );

    // FASE 1 — honest send state: the receipt is ALWAYS created as DRAFT first.
    // We only flip it to SENT after the email actually leaves, or to SEND_FAILED
    // if the provider rejects it. No more false "sent" before the email goes out.
    const document = await this.prisma.document.create({
      data: {
        documentNumber,
        userId,
        companyProfileId,
        customerId: dto.customerId ?? null,
        documentTypeId: docType.id,
        formDefinitionId: formDefinition.id,
        receiptTemplateId: template.id,
        status: DocumentStatus.DRAFT,
        contractDate: new Date(),
        countedInBilling: false,
        isOverage: false,
        data: { create: { dataJson } },
      },
    });

    // Persist the generated PDF to R2 for history/download (every receipt,
    // sent or not). Best-effort: a storage failure must not fail receipt creation.
    try {
      await this.persistReceiptToR2(
        document.id,
        companyProfileId,
        pdfBuffer,
        `${receiptNumber}.pdf`,
      );
    } catch (err) {
      this.logger.error(
        `[ReceiptsService] R2 persist failed for ${receiptNumber}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!send) {
      return { document, receiptNumber, pdf: pdfBuffer };
    }

    if (!dto.recipientEmail) {
      throw new BadRequestException(
        'recipientEmail is required when send=true',
      );
    }
    const company = await this.prisma.companyProfile.findUnique({
      where: { id: companyProfileId },
      select: { companyName: true },
    });

    try {
      const { id: providerEmailId } = await this.email.sendReceipt({
        to: dto.recipientEmail,
        receiptNumber,
        clientName: dto.client,
        companyName: company?.companyName ?? 'NTSsign',
        pdfBuffer,
      });

      const sent = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.SENT,
          sentAt: new Date(),
          lastSentRecipientEmail: dto.recipientEmail,
          // First send → counts as attempt #1 in the resend policy.
          sendCount: 1,
          lastAttemptAt: new Date(),
          providerEmailId: providerEmailId || null,
          sendError: null,
        },
      });
      return { document: sent, receiptNumber, pdf: pdfBuffer };
    } catch (err) {
      // The receipt exists, the PDF is valid — only delivery failed. Mark it
      // SEND_FAILED with the reason so the UI shows the truth and the user can
      // retry, instead of a 500 + a phantom "sent" receipt.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[ReceiptsService] Receipt ${receiptNumber} email failed: ${reason}`,
      );
      const failed = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.SEND_FAILED,
          sendError: reason,
          // A failed first send still counts as attempt #1 in the policy.
          lastSentRecipientEmail: dto.recipientEmail,
          sendCount: 1,
          lastAttemptAt: new Date(),
        },
      });
      return {
        document: failed,
        receiptNumber,
        pdf: pdfBuffer,
        sendError: reason,
      };
    }
  }

  // Build the generator input (keys match fieldMappingJson). Shared by a fresh
  // create (from the DTO) and a regenerate (from the stored dataJson).
  private buildPdfData(src: ReceiptPdfSource): Record<string, string | number> {
    return {
      receipt_number: src.receipt_number,
      date: src.date,
      client: src.client,
      amount: src.amount,
      payment_n: `${src.payment_current ?? 1} of ${src.payment_total ?? 1}`,
      payment_for: src.payment_for ?? '',
      received_by: src.received_by ?? '',
      other_label: src.other_label ?? '',
      payment_method: src.payment_method,
    };
  }

  private asObject(
    json: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> {
    return json && typeof json === 'object' && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  }

  // Safe readers off an unknown-valued JSON object (avoids stringifying objects).
  private readStr(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return fallback;
  }

  private readNum(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  // Load a receipt the user is allowed to touch (same tenant + actually a
  // PAYMENT_RECEIPT), with the data + template needed to regenerate/resend.
  private async loadReceiptForUser(userId: string, documentId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyProfileId) {
      throw new BadRequestException('User has no company profile');
    }
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        companyProfileId: user.companyProfileId,
        documentType: { code: RECEIPT_TYPE_CODE },
      },
      include: {
        data: true,
        receiptTemplate: true,
        companyProfile: { select: { companyName: true } },
      },
    });
    if (!document) {
      throw new NotFoundException('Receipt not found');
    }
    return document;
  }

  // Rebuild the PDF from stored dataJson (the receipt PDF is NOT persisted).
  private regenerateReceiptPdf(
    template: ReceiptTemplateLike,
    dataJson: Record<string, unknown>,
    fallbackNumber: string,
  ): Promise<Buffer> {
    const pdfData = this.buildPdfData({
      receipt_number: this.readStr(dataJson.receipt_number, fallbackNumber),
      date: this.readStr(dataJson.date),
      client: this.readStr(dataJson.client),
      amount: this.readNum(dataJson.amount, 0),
      payment_current: this.readNum(dataJson.payment_current, 1),
      payment_total: this.readNum(dataJson.payment_total, 1),
      payment_for: this.readStr(dataJson.payment_for),
      received_by: this.readStr(dataJson.received_by),
      other_label: this.readStr(dataJson.other_label),
      payment_method: this.readStr(dataJson.payment_method),
    });
    return this.receiptPdf.generate(template, pdfData);
  }

  /**
   * Serve a receipt's PDF. With R2 configured: ensure the PDF is in R2 (lazy
   * backfill for receipts created before R2) and 302-redirect to a short-lived
   * presigned URL (no filename → inline, so the iframe preview keeps working).
   * Without R2: fall back to regenerating and streaming inline (legacy).
   */
  async streamReceiptPdf(
    userId: string,
    documentId: string,
    res: Response,
  ): Promise<void> {
    const document = await this.loadReceiptForUser(userId, documentId);
    if (!document.receiptTemplate) {
      throw new BadRequestException('Receipt template not found');
    }

    if (this.r2.isConfigured() && document.companyProfileId) {
      const existing = await this.prisma.documentFile.findFirst({
        where: { documentId: document.id, fileType: DocumentFileType.RECEIPT },
      });
      if (!existing) {
        // Lazy backfill: regenerate once and upload.
        const buffer = await this.regenerateReceiptPdf(
          document.receiptTemplate as unknown as ReceiptTemplateLike,
          this.asObject(document.data?.dataJson),
          document.documentNumber,
        );
        await this.persistReceiptToR2(
          document.id,
          document.companyProfileId,
          buffer,
          `${document.documentNumber}.pdf`,
        );
      }
      const key = this.receiptR2Key(document.companyProfileId, document.id);
      const url = await this.r2.getPresignedDownloadUrl(key, 300);
      res.redirect(302, url);
      return;
    }

    // Fallback (R2 disabled): regenerate on the fly and stream inline.
    const pdfBuffer = await this.regenerateReceiptPdf(
      document.receiptTemplate as unknown as ReceiptTemplateLike,
      this.asObject(document.data?.dataJson),
      document.documentNumber,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.documentNumber}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  /**
   * Resend a receipt's email. SEND_FAILED → immediate retry (no cooldown). SENT
   * → resend a copy, gated by the shared 24h cooldown (bypassed when the
   * recipient email changed). Marks SENT/SEND_FAILED based on the real result.
   */
  async resendReceipt(userId: string, documentId: string) {
    const document = await this.loadReceiptForUser(userId, documentId);
    const isFailed = document.status === DocumentStatus.SEND_FAILED;
    const isSent = document.status === DocumentStatus.SENT;
    const isDraft = document.status === DocumentStatus.DRAFT;
    // DRAFT = first send (from the kebab); SEND_FAILED = retry; both skip the
    // cooldown. Only an already-SENT receipt is rate-limited.
    if (!isFailed && !isSent && !isDraft) {
      throw new BadRequestException(
        'Only draft, sent or failed receipts can be sent',
      );
    }
    if (!document.receiptTemplate) {
      throw new BadRequestException('Receipt template not found');
    }

    const dataJson = this.asObject(document.data?.dataJson);
    const recipientEmail = normalizeEmail(
      typeof dataJson.email === 'string' ? dataJson.email : null,
    );
    if (!recipientEmail) {
      throw new BadRequestException(
        'This receipt has no recipient email to resend to',
      );
    }

    // Resend policy v2: 3-email burst → 1 per 10 min → hard cap of 10, per
    // (receipt, recipient email). Email change resets the counter. Counts every
    // attempt (SENT or SEND_FAILED). Contracts are unaffected (own 24h policy).
    const decision = evaluateReceiptResend({
      sendCount: document.sendCount,
      lastAttemptAt: document.lastAttemptAt,
      lastEmail: document.lastSentRecipientEmail,
      currentEmail: recipientEmail,
    });
    if (!decision.allowed) {
      throw new BadRequestException(
        receiptResendBlockMessage(decision, recipientEmail),
      );
    }
    const newSendCount = nextSendCount(decision, document.sendCount);

    const pdfBuffer = await this.regenerateReceiptPdf(
      document.receiptTemplate as unknown as ReceiptTemplateLike,
      dataJson,
      document.documentNumber,
    );

    try {
      const { id: providerEmailId } = await this.email.sendReceipt({
        to: recipientEmail,
        receiptNumber: this.readStr(
          dataJson.receipt_number,
          document.documentNumber,
        ),
        clientName: this.readStr(dataJson.client),
        companyName: document.companyProfile?.companyName ?? 'NTSsign',
        pdfBuffer,
      });
      const sent = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.SENT,
          sentAt: new Date(),
          lastSentRecipientEmail: recipientEmail,
          sendCount: newSendCount,
          lastAttemptAt: new Date(),
          providerEmailId: providerEmailId || null,
          sendError: null,
        },
      });
      return { document: sent };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[ReceiptsService] Receipt ${document.documentNumber} resend failed: ${reason}`,
      );
      const failed = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.SEND_FAILED,
          sendError: reason,
          // A failed attempt still counts against the policy, and records the
          // attempted recipient so the counter tracks the right pair.
          lastSentRecipientEmail: recipientEmail,
          sendCount: newSendCount,
          lastAttemptAt: new Date(),
        },
      });
      return { document: failed, sendError: reason };
    }
  }

  /**
   * Edit a receipt's stored data. Only DRAFT or SEND_FAILED are editable — a
   * SENT receipt is an issued document and must not be altered.
   */
  async updateReceipt(
    userId: string,
    documentId: string,
    dto: UpdateReceiptDto,
  ) {
    const document = await this.loadReceiptForUser(userId, documentId);
    if (
      document.status !== DocumentStatus.DRAFT &&
      document.status !== DocumentStatus.SEND_FAILED
    ) {
      throw new BadRequestException(
        'Only draft or send-failed receipts can be edited',
      );
    }

    // PATCH semantics: start from the stored data, overwrite only provided keys.
    const merged: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(
      this.asObject(document.data?.dataJson),
    )) {
      if (typeof v === 'string' || typeof v === 'number') merged[k] = v;
    }
    const setIf = (key: string, value: string | number | undefined) => {
      if (value !== undefined) merged[key] = value;
    };
    setIf('client', dto.client);
    setIf('email', dto.recipientEmail);
    setIf('amount', dto.amount);
    setIf('date', dto.date);
    setIf('payment_method', dto.payment_method);
    setIf('other_label', dto.other_label);
    setIf('payment_for', dto.payment_for);
    setIf('payment_current', dto.payment_current);
    setIf('payment_total', dto.payment_total);
    setIf('received_by', dto.received_by);
    setIf('phone', dto.phone);

    const updated = await this.prisma.document.update({
      where: { id: document.id },
      data: {
        customerId: dto.customerId ?? document.customerId,
        lastEditedAt: new Date(),
        data: { update: { dataJson: merged } },
      },
      include: { data: true },
    });

    // The data (and thus the rendered PDF) changed — drop the cached R2 copy so
    // the next view/send regenerates and re-uploads the current version.
    await this.prisma.documentFile.deleteMany({
      where: { documentId: document.id, fileType: DocumentFileType.RECEIPT },
    });

    return { document: updated };
  }

  /**
   * Correlative per (tenant, year) — resets each year because the counter row
   * is keyed by year. The transaction + atomic upsert/increment prevents two
   * concurrent receipts from getting the same number.
   */
  private nextReceiptNumber(
    companyProfileId: string,
    year: number,
    format: string,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.receiptCounter.upsert({
        where: { companyProfileId_year: { companyProfileId, year } },
        create: { companyProfileId, year, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      return format
        .replace('{YYYY}', String(year))
        .replace('{NNNN}', String(counter.lastNumber).padStart(4, '0'));
    });
  }

  // Internal, globally-unique Document number (decoupled from the per-tenant
  // receipt number so two tenants never collide on the global unique index).
  private async generateReceiptDocumentNumber(
    documentTypeId: string,
    code: string,
  ): Promise<string> {
    const prefix = `${code}-`;
    const existing = await this.prisma.document.findMany({
      where: { documentTypeId, documentNumber: { startsWith: prefix } },
      select: { documentNumber: true },
    });
    let max = 0;
    for (const d of existing) {
      const n = parseInt(d.documentNumber.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return `${prefix}${String(max + 1).padStart(6, '0')}`;
  }
}
