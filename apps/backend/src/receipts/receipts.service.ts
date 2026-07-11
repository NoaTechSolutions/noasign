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
  ReceiptTemplate,
  StorageProvider,
  TemplateCategory,
} from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { R2Service } from '../storage/r2.service';
import { ReceiptPdfService, ReceiptTemplateLike } from './receipt-pdf.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { normalizeEmail } from '../common/resend-cooldown';
import {
  evaluateReceiptResend,
  nextSendCount,
  receiptResendBlockMessage,
} from '../common/receipt-resend-policy';

const RECEIPT_TYPE_CODE = 'PAYMENT_RECEIPT';
const INVOICE_TYPE_CODE = 'INVOICE';

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
  notes?: string | null;
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

  private getBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Model C — receipt billing fields to stamp on a receipt's FIRST successful
   * send. Receipt quota is a per-tenant monthly pool. MASTERs and
   * receiptsUnlimited tenants never hit overage. Reissues never count (callers
   * guard on supersedesId before calling this), so this only resolves the
   * billingPeriod + whether the receipt lands in overage.
   */
  private async getReceiptBillingState(
    companyProfileId: string,
    isSuperadmin: boolean,
  ): Promise<{ billingPeriod: string; isReceiptOverage: boolean }> {
    const billingPeriod = this.getBillingPeriod();
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: companyProfileId },
      select: { receiptsUnlimited: true, monthlyReceiptLimit: true },
    });
    const receiptsUnlimited =
      isSuperadmin || (profile?.receiptsUnlimited ?? false);
    if (receiptsUnlimited) return { billingPeriod, isReceiptOverage: false };
    const used = await this.prisma.document.count({
      where: { companyProfileId, countedAsReceipt: true, billingPeriod },
    });
    return {
      billingPeriod,
      isReceiptOverage: used >= (profile?.monthlyReceiptLimit ?? 0),
    };
  }

  /**
   * Generate a receipt PDF from the tenant's ReceiptTemplate, persist it as a
   * PAYMENT_RECEIPT Document, and (optionally) email it. Returns the document +
   * the correlative receipt number + the generated PDF buffer.
   */
  async createReceipt(
    userId: string,
    dto: CreateReceiptDto,
    opts?: { supersedesId?: string },
  ) {
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
    // Superadmin flow: a SUPERADMIN may borrow another user's design by passing that
    // user's receiptTemplateId (any tenant). The document stays the creator's
    // (userId + the per-tenant REC- counter below both use the creator). Other
    // callers always get their own company's template.
    let template: ReceiptTemplate | null = null;
    if (dto.receiptTemplateId && user.role === 'SUPERADMIN') {
      template = await this.prisma.receiptTemplate.findFirst({
        where: { id: dto.receiptTemplateId, isActive: true },
      });
      if (!template) {
        throw new NotFoundException('Selected receipt template not found');
      }
    } else {
      template = await this.resolveActivePdfTemplate(
        companyProfileId,
        TemplateCategory.RECEIPT,
      );
      if (!template) {
        throw new NotFoundException(
          'No receipt template configured for this company',
        );
      }
    }

    const year = new Date().getFullYear();
    const receiptNumber = await this.nextReceiptNumber(
      companyProfileId,
      docType.id,
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
      notes: dto.notes,
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
      notes: dto.notes ?? '',
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
      userId,
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
        // Reissue (2c): link the new receipt to the original it corrects.
        supersedesId: opts?.supersedesId ?? null,
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

      // Model C — count the receipt toward the tenant's monthly quota on its
      // first successful send. Reissues never count (decision C).
      const billing = opts?.supersedesId
        ? null
        : await this.getReceiptBillingState(
            companyProfileId,
            user.role === 'SUPERADMIN',
          );
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
          ...(billing
            ? {
                countedAsReceipt: true,
                billingPeriod: billing.billingPeriod,
                isReceiptOverage: billing.isReceiptOverage,
              }
            : {}),
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
  // ───────────────────────────────────────────────────────────────────────────
  // INVOICES (Phase 2) — DIRECT_PDF, NEVER BoldSign. Parallel to createReceipt:
  // reuses the same numbering / documentNumber / R2-persist helpers, but (a) uses
  // the INVOICE document type + template category, (b) dispatches the render by the
  // template's standard renderMode (acroform-overlay = the hybrid engine), and
  // (c) adapts the schema-driven wizard form data into the invoice base PDF's flat
  // AcroForm fields. Kept OUT of createReceipt so the receipt path is untouched.
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create an invoice PDF from the tenant's active INVOICE template, persist it as
   * a DRAFT Document, and (best-effort) store the PDF in R2. Money is recomputed
   * server-side from quantity × price — the client's totals are never trusted.
   * Returns the document + the correlative INV- number + the generated buffer.
   */
  async createInvoice(userId: string, dto: CreateInvoiceDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyProfileId) {
      throw new BadRequestException('User has no company profile');
    }
    const companyProfileId = user.companyProfileId;

    const docType = await this.prisma.documentType.findUnique({
      where: { code: INVOICE_TYPE_CODE },
    });
    if (!docType) {
      throw new NotFoundException(
        `Document type ${INVOICE_TYPE_CODE} not found — run the invoice seed`,
      );
    }
    // Shadow-BoldSign guard: an invoice is DIRECT_PDF. If the type is still
    // BOLDSIGN, creating it here would produce a broken signature-less row — refuse
    // instead. (The seed sets generationMode=DIRECT_PDF; this catches a stale row.)
    if (docType.generationMode !== 'DIRECT_PDF') {
      throw new BadRequestException(
        'INVOICE document type is not DIRECT_PDF — fix its generationMode',
      );
    }
    const formDefinition = await this.prisma.formDefinition.findFirst({
      where: { documentTypeId: docType.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!formDefinition) {
      throw new NotFoundException('No active invoice form definition');
    }

    const template = await this.resolveActivePdfTemplate(
      companyProfileId,
      TemplateCategory.INVOICE,
    );
    if (!template) {
      throw new NotFoundException(
        'No invoice template configured for this company',
      );
    }

    const year = new Date().getFullYear();
    const receiptNumber = await this.nextReceiptNumber(
      companyProfileId,
      docType.id,
      year,
      template.numberFormat,
    );
    const issueDate = this.formatInvoiceDate(new Date());

    // Stored dataJson = the raw wizard data + the server-authoritative number,
    // issue date and recomputed money. It is the SINGLE source the create render
    // and any re-render both read from (buildInvoicePdfData).
    const dataJson = this.buildInvoiceDataJson(
      dto.data,
      receiptNumber,
      issueDate,
    );
    const pdfData = this.buildInvoicePdfData(dataJson);
    const pdfBuffer = await this.renderInvoice(template, pdfData);

    const documentNumber = await this.generateReceiptDocumentNumber(
      docType.id,
      docType.code,
      userId,
    );

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

    try {
      await this.persistReceiptToR2(
        document.id,
        companyProfileId,
        pdfBuffer,
        `${receiptNumber}.pdf`,
      );
    } catch (err) {
      this.logger.error(
        `[ReceiptsService] R2 persist failed for invoice ${receiptNumber}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { document, receiptNumber, pdf: pdfBuffer };
  }

  /**
   * Stream a freshly-regenerated invoice PDF from the stored form data, using the
   * SAME renderMode dispatch + adapter as create — a view/download is byte-for-byte
   * the same pipeline. (Invoices are not emailed in this phase.)
   */
  async streamInvoicePdf(
    userId: string,
    documentId: string,
    res: Response,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyProfileId) {
      throw new BadRequestException('User has no company profile');
    }
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, companyProfileId: user.companyProfileId },
      include: { data: true, receiptTemplate: true },
    });
    if (!document || !document.receiptTemplate) {
      throw new NotFoundException('Invoice not found');
    }
    const dataJson =
      (document.data?.dataJson as Record<string, string> | undefined) ?? {};
    const pdfData = this.buildInvoicePdfData(dataJson);
    const pdfBuffer = await this.renderInvoice(
      document.receiptTemplate,
      pdfData,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.documentNumber}.pdf"`,
    );
    res.end(pdfBuffer);
  }

  // Dispatch the render by the template's standard renderMode:
  //   'acroform-overlay' → generateFromAcroFormOverlay (hybrid — invoices)
  //   'acroform'         → generateFromAcroForm (legacy AcroForm fill)
  //   'overlay'/other    → generate (coordinate stamp — receipts)
  // renderMode lives on ReceiptTemplateStandard (not the per-tenant instance), so
  // resolve it via the instance's standardId. Defaults to the hybrid engine.
  private async renderInvoice(
    template: ReceiptTemplate,
    pdfData: Record<string, string | number>,
  ): Promise<Buffer> {
    const like = template as unknown as ReceiptTemplateLike;
    const standard = template.standardId
      ? await this.prisma.receiptTemplateStandard.findUnique({
          where: { id: template.standardId },
          select: { renderMode: true },
        })
      : null;
    const mode = standard?.renderMode ?? 'acroform-overlay';
    if (mode === 'acroform-overlay') {
      return this.receiptPdf.generateFromAcroFormOverlay(like, pdfData);
    }
    if (mode === 'acroform') {
      return this.receiptPdf.generateFromAcroForm(like, pdfData);
    }
    return this.receiptPdf.generate(like, pdfData);
  }

  // ── Invoice data adapters ───────────────────────────────────────────────────

  private formatInvoiceDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  }

  private toMoney(raw: string | number | null | undefined): number {
    const n = Number(String(raw ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  private fmtMoney(n: number): string {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Merge the raw wizard form data with the server number, issue date and the
  // recomputed money (total = qty × price; subtotal = total; gran_total = subtotal,
  // since Laura is a single line). This is exactly what is stored in dataJson and
  // the only input to buildInvoicePdfData — create and re-render stay consistent.
  private buildInvoiceDataJson(
    form: Record<string, string>,
    receiptNumber: string,
    issueDate: string,
  ): Record<string, string> {
    const qty = Math.max(
      0,
      Math.trunc(
        Number(String(form.quantity ?? '').replace(/[^0-9]/g, '')) || 0,
      ),
    );
    const price = this.toMoney(form.price);
    const total = qty * price;
    return {
      ...form,
      quantity: String(qty),
      price: this.fmtMoney(price),
      total: this.fmtMoney(total),
      subtotal: this.fmtMoney(total),
      gran_total: this.fmtMoney(total),
      receipt_number: receiptNumber,
      invoice_date: issueDate,
    };
  }

  // Adapt the stored invoice data into the base PDF's flat AcroForm fields:
  // billed_to = 3 composed lines, service = 4 composed lines, the SHORT display
  // number ("0001" — the label already reads "Invoice No."), and money already
  // formatted with NO "$" (the base art draws the "$"). Field names MUST match the
  // template's fieldMappingJson — note gran_total (not grand_total).
  private buildInvoicePdfData(
    data: Record<string, string>,
  ): Record<string, string | number> {
    const name =
      (data.company_name ?? '').trim() ||
      [data.first_name, data.middle_name, data.last_name]
        .map((s) => (s ?? '').trim())
        .filter(Boolean)
        .join(' ');
    const cityState = [data.city, data.state]
      .map((s) => (s ?? '').trim())
      .filter(Boolean)
      .join(', ');
    const cityStateZip = [cityState, (data.zip ?? '').trim()]
      .filter(Boolean)
      .join(' ');
    const billed_to = [name, (data.street ?? '').trim(), cityStateZip]
      .filter((l) => l && l.length)
      .join('\n');

    const service = [
      (data.service_type ?? '').trim(),
      `Event Date: ${(data.event_date ?? '').trim()}`,
      `Event Name: ${(data.event_name ?? '').trim()}`,
      `Event Location: ${(data.event_location ?? '').trim()}`,
    ].join('\n');

    // Short number for the small box; the canonical INV-YYYY-NNNN stays in dataJson.
    const numberShort =
      (data.receipt_number ?? '').split('-').pop() ||
      (data.receipt_number ?? '');

    return {
      billed_to,
      number: numberShort,
      date: data.invoice_date ?? '',
      service,
      quantity: data.quantity ?? '',
      price: data.price ?? '',
      total: data.total ?? '',
      subtotal: data.subtotal ?? '',
      gran_total: data.gran_total ?? '',
    };
  }

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
      notes: src.notes ?? '',
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
    opts?: { watermark?: string },
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
    return this.receiptPdf.generate(template, pdfData, opts);
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

    // Voided (reissued) receipts render with a VOID watermark.
    const watermark = document.supersededAt ? 'VOID' : undefined;

    if (this.r2.isConfigured() && document.companyProfileId) {
      const existing = await this.prisma.documentFile.findFirst({
        where: { documentId: document.id, fileType: DocumentFileType.RECEIPT },
      });
      // Stream the R2-stored bytes through the backend (same-origin) so the
      // in-app <iframe> preview can read them. A 302 to a presigned R2 URL fails
      // here: R2 sends no CORS headers, so the browser blocks the blob fetch
      // that follows the redirect → blank PDF.
      let pdfBuffer: Buffer;
      if (existing) {
        pdfBuffer = await this.r2.getObject(existing.storageUrl);
      } else {
        // Lazy backfill: regenerate once, upload, then serve that buffer.
        pdfBuffer = await this.regenerateReceiptPdf(
          document.receiptTemplate as unknown as ReceiptTemplateLike,
          this.asObject(document.data?.dataJson),
          document.documentNumber,
          { watermark },
        );
        await this.persistReceiptToR2(
          document.id,
          document.companyProfileId,
          pdfBuffer,
          `${document.documentNumber}.pdf`,
        );
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${document.documentNumber}.pdf"`,
      );
      res.send(pdfBuffer);
      return;
    }

    // Fallback (R2 disabled): regenerate on the fly and stream inline.
    const pdfBuffer = await this.regenerateReceiptPdf(
      document.receiptTemplate as unknown as ReceiptTemplateLike,
      this.asObject(document.data?.dataJson),
      document.documentNumber,
      { watermark },
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
      // Model C — count on the FIRST successful send (covers a DRAFT sent from
      // the kebab, and a SEND_FAILED first send that now succeeds). Guards keep
      // it from double-counting (countedAsReceipt) or counting a reissue.
      let receiptBilling: Prisma.DocumentUpdateInput | null = null;
      if (
        !document.countedAsReceipt &&
        !document.supersedesId &&
        document.companyProfileId
      ) {
        const owner = await this.prisma.user.findUnique({
          where: { id: document.userId },
          select: { role: true },
        });
        const state = await this.getReceiptBillingState(
          document.companyProfileId,
          owner?.role === 'SUPERADMIN',
        );
        receiptBilling = {
          countedAsReceipt: true,
          billingPeriod: state.billingPeriod,
          isReceiptOverage: state.isReceiptOverage,
        };
      }
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
          ...(receiptBilling ?? {}),
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
   * Reissue (2c): a SENT receipt is never edited — a correction creates a NEW
   * receipt (next number) with the corrected data, sends it, links it to the
   * original (supersedesId), and voids the original (supersededAt + a VOID
   * watermark on its stored PDF). The original stays SENT and fully downloadable
   * — the accounting record is preserved, now visibly voided.
   */
  async reissueReceipt(
    userId: string,
    originalId: string,
    dto: CreateReceiptDto,
  ) {
    const original = await this.loadReceiptForUser(userId, originalId);
    if (original.status !== DocumentStatus.SENT) {
      throw new BadRequestException('Only sent receipts can be reissued');
    }
    if (original.supersededAt) {
      throw new BadRequestException('This receipt was already reissued');
    }
    // Reissue always sends the corrected copy, so a recipient is required up
    // front (the DTO only conditionally requires it when send === true).
    if (!dto.recipientEmail) {
      throw new BadRequestException(
        'recipientEmail is required to reissue a receipt',
      );
    }

    // Create + send the corrected receipt, linked to the original.
    const result = await this.createReceipt(
      userId,
      { ...dto, send: true },
      { supersedesId: originalId },
    );

    // Void the original: mark superseded + re-stamp its R2 PDF with VOID.
    await this.voidOriginalReceipt(original);

    return result;
  }

  // Mark the original receipt superseded and overwrite its stored PDF with a
  // VOID-watermarked version so every later download is unmistakably voided. The
  // accounting data (dataJson, number, row) is preserved — only the rendered PDF
  // gains the stamp. When R2 is disabled the streamReceiptPdf fallback applies
  // the watermark on the fly (driven by supersededAt), so this re-stamp is a no-op.
  private async voidOriginalReceipt(original: {
    id: string;
    companyProfileId: string | null;
    documentNumber: string;
    receiptTemplate: unknown;
    data?: { dataJson?: Prisma.JsonValue } | null;
  }): Promise<void> {
    await this.prisma.document.update({
      where: { id: original.id },
      data: { supersededAt: new Date() },
    });

    if (!this.r2.isConfigured() || !original.companyProfileId) {
      // R2 disabled → streamReceiptPdf watermarks on the fly (driven by
      // supersededAt). Nothing to stamp at rest.
      return;
    }

    const existing = await this.prisma.documentFile.findFirst({
      where: { documentId: original.id, fileType: DocumentFileType.RECEIPT },
    });

    let stamped: Buffer;
    if (existing) {
      // PRIMARY path: overlay VOID on the EXISTING stored PDF — the very file
      // that was created + sent — so it's the same receipt, now stamped VOID.
      const current = await this.r2.getObject(existing.storageUrl);
      stamped = await this.receiptPdf.stampWatermark(current, 'VOID');
    } else if (original.receiptTemplate) {
      // Fallback: no stored copy yet (created before R2) → regenerate + stamp.
      stamped = await this.regenerateReceiptPdf(
        original.receiptTemplate as unknown as ReceiptTemplateLike,
        this.asObject(original.data?.dataJson),
        original.documentNumber,
        { watermark: 'VOID' },
      );
    } else {
      return;
    }

    await this.persistReceiptToR2(
      original.id,
      original.companyProfileId,
      stamped,
      `${original.documentNumber}.pdf`,
    );
  }

  /**
   * Void (2c): mark a SENT receipt VOID WITHOUT a replacement (e.g. sent by
   * mistake, no correction needed). Same VOID treatment as a reissue
   * (supersededAt + VOID stamp on the stored PDF) but creates NO new receipt and
   * sets NO supersededBy link — so traceability shows just VOID, no "Reissued to".
   */
  async voidReceipt(userId: string, documentId: string) {
    const original = await this.loadReceiptForUser(userId, documentId);
    if (original.status !== DocumentStatus.SENT) {
      throw new BadRequestException('Only sent receipts can be voided');
    }
    if (original.supersededAt) {
      throw new BadRequestException('This receipt is already void');
    }
    await this.voidOriginalReceipt(original);
    const updated = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    return { document: updated };
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
  /**
   * Resolve the active per-tenant DIRECT_PDF template for a category (generic —
   * RECEIPT today, INVOICE next). Prefers the tenant's CompanyTemplate default —
   * the template chosen on the Templates screen — and ALWAYS falls back to the
   * legacy "newest active per-tenant template" when the tenant has no
   * CompanyTemplate default (e.g. environments where the backfill has not run).
   * The backfill (migration 20260706160000) seeds every existing tenant a default
   * equal to the legacy pick, so enabling this preference is a proven no-op until
   * the user explicitly selects a different template. Does not touch the
   * SUPERADMIN borrow path.
   */
  private async resolveActivePdfTemplate(
    companyProfileId: string,
    category: TemplateCategory,
  ): Promise<ReceiptTemplate | null> {
    const assignment = await this.prisma.companyTemplate.findFirst({
      where: { companyProfileId, category, isDefault: true, isActive: true },
      include: { receiptTemplate: true },
    });
    if (assignment?.receiptTemplate?.isActive) {
      return assignment.receiptTemplate;
    }
    return this.prisma.receiptTemplate.findFirst({
      where: { companyProfileId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private nextReceiptNumber(
    companyProfileId: string,
    documentTypeId: string,
    year: number,
    format: string,
  ): Promise<string> {
    // Generic per-(tenant, documentType, year) visible series (REC-/INV-…).
    // Atomic increment via upsert. Backfilled from the legacy ReceiptCounter so
    // the receipt series continues at the same next number (see migration
    // 20260706140000). ReceiptCounter is now frozen legacy.
    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.documentSeriesCounter.upsert({
        where: {
          companyProfileId_documentTypeId_year: {
            companyProfileId,
            documentTypeId,
            year,
          },
        },
        create: { companyProfileId, documentTypeId, year, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      return format
        .replace('{YYYY}', String(year))
        .replace('{NNNN}', String(counter.lastNumber).padStart(4, '0'));
    });
  }

  // Internal Document number, scoped PER USER (same as contracts) so a master
  // borrowing another user's template gets a number from THEIR OWN sequence —
  // it never consumes the form owner's. Matches @@unique([userId, documentTypeId,
  // documentNumber]); the per-tenant REC- number stays separate.
  private async generateReceiptDocumentNumber(
    documentTypeId: string,
    code: string,
    userId: string,
  ): Promise<string> {
    // Atomic per-(user, type) increment (replaces an O(n) max-in-memory scan that
    // raced under concurrency). Backfilled continuity — migration 20260706150000.
    const counter = await this.prisma.$transaction((tx) =>
      tx.userDocumentSequence.upsert({
        where: { userId_documentTypeId: { userId, documentTypeId } },
        create: { userId, documentTypeId, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      }),
    );
    return `${code}-${String(counter.lastNumber).padStart(6, '0')}`;
  }

  /**
   * Receipt dashboard stats for a tenant: $ issued in the current billing period
   * + counts by the REAL receipt statuses (DRAFT / SENT / SEND_FAILED / CANCELLED
   * and the derived VOID = supersededAt set). Contracts' signature states
   * (VIEWED/SIGNED/COMPLETED) never apply to receipts. Computed in memory over
   * the tenant's receipts — fine at current volume.
   */
  async getReceiptStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyProfileId: true },
    });
    if (!user?.companyProfileId) {
      throw new NotFoundException('Company profile not found');
    }

    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}`;

    const receipts = await this.prisma.document.findMany({
      where: {
        companyProfileId: user.companyProfileId,
        documentType: { code: RECEIPT_TYPE_CODE },
      },
      select: {
        status: true,
        supersededAt: true,
        countedAsReceipt: true,
        billingPeriod: true,
        data: { select: { dataJson: true } },
      },
    });

    let draft = 0;
    let sent = 0;
    let sendFailed = 0;
    let cancelled = 0;
    let voided = 0;
    let amountThisMonth = 0;
    let receiptsThisMonth = 0;

    for (const r of receipts) {
      // VOID is derived (supersededAt set); the internal status stays SENT.
      if (r.supersededAt) {
        voided++;
      } else if (r.status === DocumentStatus.DRAFT) {
        draft++;
      } else if (r.status === DocumentStatus.SENT) {
        sent++;
      } else if (r.status === DocumentStatus.SEND_FAILED) {
        sendFailed++;
      } else if (r.status === DocumentStatus.CANCELLED) {
        cancelled++;
      }

      // $ this month = amount of receipts counted toward billing this period.
      if (r.countedAsReceipt && r.billingPeriod === billingPeriod) {
        receiptsThisMonth++;
        const dataJson = (r.data?.dataJson ?? {}) as Record<string, unknown>;
        amountThisMonth += this.readNum(dataJson.amount, 0);
      }
    }

    // Top 5 clients by receipt count (all-time). Grouped in the DB, then joined to
    // the customer name. Receipts without a customer are excluded.
    const grouped = await this.prisma.document.groupBy({
      by: ['customerId'],
      where: {
        companyProfileId: user.companyProfileId,
        documentType: { code: RECEIPT_TYPE_CODE },
        customerId: { not: null },
      },
      _count: { customerId: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: 5,
    });
    const topCustomerIds = grouped
      .map((g) => g.customerId)
      .filter((id): id is string => !!id);
    const topCustomers = topCustomerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const nameById = new Map(topCustomers.map((c) => [c.id, c.fullName]));
    const topClients = grouped.map((g) => ({
      name: (g.customerId && nameById.get(g.customerId)) || 'Unknown client',
      count: g._count.customerId,
    }));

    return {
      billingPeriod,
      receiptsThisMonth,
      // "Total issued" = active (non-void) sent receipts.
      totalIssued: sent,
      amountThisMonth,
      byStatus: { draft, sent, sendFailed, cancelled, void: voided },
      topClients,
    };
  }
}
