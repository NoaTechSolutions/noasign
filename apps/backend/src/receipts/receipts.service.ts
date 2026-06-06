import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ReceiptPdfService, ReceiptTemplateLike } from './receipt-pdf.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

const RECEIPT_TYPE_CODE = 'PAYMENT_RECEIPT';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptPdf: ReceiptPdfService,
    private readonly email: EmailService,
  ) {}

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
    const pdfData: Record<string, string | number> = {
      receipt_number: receiptNumber,
      date: dto.date,
      client: dto.client,
      amount: dto.amount,
      payment_n: `${dto.payment_current ?? 1} of ${dto.payment_total ?? 1}`,
      payment_for: dto.payment_for ?? '',
      received_by: dto.received_by ?? '',
      other_label: dto.other_label ?? '',
      payment_method: dto.payment_method,
    };

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

    if (!send) {
      return { document, receiptNumber, pdf: pdfBuffer };
    }

    if (!dto.recipientEmail) {
      throw new BadRequestException('recipientEmail is required when send=true');
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
