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
): Promise<{ id: string; status: DocumentStatus }> {
  receiptSeq += 1;
  return prisma.document.create({
    data: {
      documentNumber: `REC-E2E-${receiptSeq}`,
      userId: tenant.user.id,
      companyProfileId: tenant.company.id,
      documentTypeId: tenant.documentType.id,
      formDefinitionId: tenant.formDefinition.id,
      status,
    },
    select: { id: true, status: true },
  });
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
): Promise<{ id: string; status: DocumentStatus }> {
  invoiceSeq += 1;
  return prisma.document.create({
    data: {
      documentNumber: `INV-E2E-${invoiceSeq}`,
      userId: tenant.user.id,
      companyProfileId: tenant.company.id,
      documentTypeId: tenant.documentType.id,
      formDefinitionId: tenant.formDefinition.id,
      status,
    },
    select: { id: true, status: true },
  });
}
