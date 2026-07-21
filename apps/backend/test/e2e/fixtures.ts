import * as bcrypt from 'bcrypt';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';

// Wipe every table before a suite/test seeds fresh, so runs are isolated and
// order-independent. TRUNCATE ... CASCADE handles the FK graph in one shot;
// _prisma_migrations is left alone.
export async function resetDb(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export interface ContractTenant {
  company: { id: string; companyName: string };
  user: { id: string; email: string; role: string; companyProfileId: string | null };
  documentType: { id: string; code: string };
  formDefinition: { id: string };
  signatureTemplate: { id: string; providerTemplateId: string };
}

// A minimal but REAL contract tenant: a contracts-enabled company, an ACTIVE
// normal user, and a BOLDSIGN contract type wired to a form + signature template.
// Enough for the create→send→sign→complete cycle through the real endpoints.
export async function seedContractTenant(
  prisma: PrismaService,
): Promise<ContractTenant> {
  const company = await prisma.companyProfile.create({
    data: { companyName: 'E2E Contracts Co', contractsEnabled: true },
  });

  const user = await prisma.user.create({
    data: {
      email: 'e2e.user@test.local',
      // Real hash (low rounds for speed); auth is via a minted JWT, not login.
      passwordHash: bcrypt.hashSync('e2e-pass', 4),
      role: 'USER',
      status: 'ACTIVE',
      companyProfileId: company.id,
    },
  });

  const documentType = await prisma.documentType.create({
    // generationMode defaults to BOLDSIGN — the real contract path.
    data: { name: 'E2E Contract', code: 'CON' },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      name: 'E2E Contract Form',
      documentTypeId: documentType.id,
      isActive: true,
      schemaJson: {
        sections: [
          {
            key: 'client',
            label: 'Client',
            fields: [
              { key: 'customer_name', label: 'Customer name', type: 'text', required: true },
              { key: 'customer_email', label: 'Email', type: 'email' },
            ],
          },
        ],
      },
    },
  });

  const signatureTemplate = await prisma.signatureTemplate.create({
    data: {
      name: 'E2E Template',
      documentTypeId: documentType.id,
      providerTemplateId: 'bs-template-1',
      recipientRole: 'Client',
      isActive: true,
      companyProfileId: company.id,
    },
  });

  return { company, user, documentType, formDefinition, signatureTemplate };
}

export interface ReceiptTenant {
  company: { id: string };
  user: { id: string; email: string; role: string; companyProfileId: string | null };
  documentType: { id: string; code: string };
  formDefinition: { id: string };
}

// A receipts tenant: a company + ACTIVE user + a PAYMENT_RECEIPT (DIRECT_PDF) type
// wired to a form. Enough to seed receipt Documents and drive the delete/void
// endpoints. The receipt CREATE path (PDF generation) is intentionally NOT
// exercised here — these tests pin the lifecycle INVARIANTS, not PDF rendering.
export async function seedReceiptTenant(
  prisma: PrismaService,
): Promise<ReceiptTenant> {
  const company = await prisma.companyProfile.create({
    data: { companyName: 'E2E Receipts Co' },
  });
  const user = await prisma.user.create({
    data: {
      email: 'e2e.receipts@test.local',
      passwordHash: bcrypt.hashSync('e2e-pass', 4),
      role: 'USER',
      status: 'ACTIVE',
      companyProfileId: company.id,
    },
  });
  // code MUST be 'PAYMENT_RECEIPT' — receipts.service resolves receipts by this code.
  const documentType = await prisma.documentType.create({
    data: { name: 'E2E Receipt', code: 'PAYMENT_RECEIPT', generationMode: 'DIRECT_PDF' },
  });
  const formDefinition = await prisma.formDefinition.create({
    data: {
      name: 'E2E Receipt Form',
      documentTypeId: documentType.id,
      isActive: true,
      schemaJson: { sections: [] },
    },
  });
  return { company, user, documentType, formDefinition };
}

// Seed a receipt Document directly in a given status — bypasses the PDF-generating
// create endpoint (not what these tests exercise). Returns the created row's id.
let receiptSeq = 0;
export async function createReceiptDoc(
  prisma: PrismaService,
  tenant: ReceiptTenant,
  status: DocumentStatus,
  opts?: DocOpts,
): Promise<{ id: string; status: DocumentStatus }> {
  receiptSeq += 1;
  return createDoc(prisma, tenant, status, `REC-E2E-${receiptSeq}`, opts);
}

// An invoices tenant — same shape as a receipts tenant, but the DIRECT_PDF type
// carries code 'INVOICE' (receipts.service resolves invoices by this code).
export async function seedInvoiceTenant(
  prisma: PrismaService,
): Promise<ReceiptTenant> {
  const company = await prisma.companyProfile.create({
    data: { companyName: 'E2E Invoices Co' },
  });
  const user = await prisma.user.create({
    data: {
      email: 'e2e.invoices@test.local',
      passwordHash: bcrypt.hashSync('e2e-pass', 4),
      role: 'USER',
      status: 'ACTIVE',
      companyProfileId: company.id,
    },
  });
  const documentType = await prisma.documentType.create({
    data: { name: 'E2E Invoice', code: 'INVOICE', generationMode: 'DIRECT_PDF' },
  });
  const formDefinition = await prisma.formDefinition.create({
    data: {
      name: 'E2E Invoice Form',
      documentTypeId: documentType.id,
      isActive: true,
      schemaJson: { sections: [] },
    },
  });
  return { company, user, documentType, formDefinition };
}

// Seed an invoice Document directly in a given status (INV-numbered for clarity).
let invoiceSeq = 0;
export async function createInvoiceDoc(
  prisma: PrismaService,
  tenant: ReceiptTenant,
  status: DocumentStatus,
  opts?: DocOpts,
): Promise<{ id: string; status: DocumentStatus }> {
  invoiceSeq += 1;
  return createDoc(prisma, tenant, status, `INV-E2E-${invoiceSeq}`, opts);
}

// ── PDF-route fixtures ────────────────────────────────────────────────────────
// The PDF endpoints refuse to render a document with no receiptTemplate, so a
// test that wants to reach (or be blocked BEFORE) the renderer needs a real
// template bound to a real base PDF.

export interface DocOpts {
  receiptTemplateId?: string;
  dataJson?: Record<string, string>;
}

// Shared writer behind createReceiptDoc/createInvoiceDoc — optionally attaches a
// template and a DocumentData row so the PDF route can actually run.
async function createDoc(
  prisma: PrismaService,
  tenant: ReceiptTenant,
  status: DocumentStatus,
  documentNumber: string,
  opts?: DocOpts,
): Promise<{ id: string; status: DocumentStatus }> {
  const doc = await prisma.document.create({
    data: {
      documentNumber,
      userId: tenant.user.id,
      companyProfileId: tenant.company.id,
      documentTypeId: tenant.documentType.id,
      formDefinitionId: tenant.formDefinition.id,
      status,
      ...(opts?.receiptTemplateId
        ? { receiptTemplateId: opts.receiptTemplateId }
        : {}),
    },
    select: { id: true, status: true },
  });
  if (opts?.dataJson) {
    await prisma.documentData.create({
      data: { documentId: doc.id, dataJson: opts.dataJson },
    });
  }
  return doc;
}

// A DIRECT_PDF template pointing at a REAL base PDF shipped in assets/, resolved
// relative to process.cwd() (= apps/backend under jest), which is how
// receipt-pdf.service resolves basePdfPath. fieldMappingJson is intentionally
// empty: these tests assert the ROUTE's authorization, not the rendered art.
export async function createTemplate(
  prisma: PrismaService,
  companyProfileId: string,
  basePdfPath: string,
): Promise<{ id: string }> {
  return prisma.receiptTemplate.create({
    data: {
      companyProfileId,
      name: `E2E Template (${basePdfPath})`,
      basePdfPath,
      fieldMappingJson: [],
    },
    select: { id: true },
  });
}

export const INVOICE_BASE_PDF = 'assets/templates/INVOCE_LauraBravo.pdf';
export const RECEIPT_BASE_PDF = 'assets/templates/receipt-basic-v1.pdf';

// A SECOND, unrelated tenant — the "attacker" side of a cross-tenant test. It gets
// its own company + user but REUSES the caller's documentType/formDefinition,
// because DocumentType.code and FormDefinition are global, not per-tenant (both
// `code` and User.email are @unique, so they cannot simply be duplicated).
export async function seedPeerTenant(
  prisma: PrismaService,
  base: ReceiptTenant,
  email: string,
): Promise<ReceiptTenant> {
  const company = await prisma.companyProfile.create({
    data: { companyName: 'E2E Peer Co' },
  });
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: bcrypt.hashSync('e2e-pass', 4),
      role: 'USER',
      status: 'ACTIVE',
      companyProfileId: company.id,
    },
  });
  return {
    company,
    user,
    documentType: base.documentType,
    formDefinition: base.formDefinition,
  };
}
