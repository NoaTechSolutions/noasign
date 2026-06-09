/**
 * Idempotent per-tenant onboarding: create/update a ReceiptTemplate for ONE
 * company. The global PAYMENT_RECEIPT DocumentType + FormDefinition come from the
 * data migration (20260609130000) — this script only wires the tenant's template.
 *
 * Reuses the WPC base PDF + field mapping (the only validated receipt design
 * today). companyProfileId differs per env, so it's a required argument:
 *
 *   DATABASE_URL=... node scripts/dev-helpers/_seed-receipt-template.js <companyProfileId>
 *
 * Idempotent: upserts the template by (companyProfileId, name).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companyProfileId =
  process.argv[2] || process.env.RECEIPT_TEMPLATE_COMPANY_ID;

// Validated WPC field coordinates (generic engine; WPC is the first design).
const FIELD_MAPPING = {
  receipt_number: { type: 'text', x: 387, baseline: 488.5, font: 'Montserrat-Regular', size: 16, color: '#000000', autoShiftRightLimit: 558 },
  date: { type: 'text', x: 428, lineTop: 331, font: 'Carlito', size: 11.5 },
  client: { type: 'text', x: 118, lineTop: 371, font: 'Carlito', size: 11.5 },
  amount: { type: 'currency', x: 118, lineTop: 396, font: 'Carlito', size: 11.5 },
  payment_n: { type: 'text', x: 357, lineTop: 385, gap: -9, font: 'Carlito', size: 11.5 },
  payment_for: { type: 'text', x: 146, lineTop: 442, gap: 3.5, font: 'Carlito', size: 11.5 },
  received_by: { type: 'text', x: 138, lineTop: 465, font: 'Carlito', size: 11.5 },
  other_label: { type: 'text', x: 472, lineTop: 423, font: 'Carlito', size: 10 },
  payment_method: {
    type: 'checkbox_group', lineTop: 407, gap: -11.5, mark: 'X', font: 'Carlito-Bold', size: 12,
    options: { CASH: 63, CREDIT_DEBIT_CARD: 126, CHEQUE: 256, BANK_TRANSFER: 333, OTHER: 448 },
  },
};

const TEMPLATE_NAME = 'Receipt Template';

(async () => {
  try {
    if (!companyProfileId) {
      throw new Error(
        'Usage: node _seed-receipt-template.js <companyProfileId> (or RECEIPT_TEMPLATE_COMPANY_ID env)',
      );
    }
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyProfileId },
    });
    if (!company) throw new Error(`Company ${companyProfileId} not found`);

    // PAYMENT_RECEIPT type + form must exist (from the migration).
    const docType = await prisma.documentType.findUnique({
      where: { code: 'PAYMENT_RECEIPT' },
    });
    if (!docType) {
      throw new Error(
        'PAYMENT_RECEIPT DocumentType missing — apply migration 20260609130000 first.',
      );
    }
    const form = await prisma.formDefinition.findFirst({
      where: { documentTypeId: docType.id, isActive: true },
    });
    if (!form) {
      throw new Error(
        'No active PAYMENT_RECEIPT FormDefinition — apply migration 20260609130000 first.',
      );
    }

    const data = {
      name: TEMPLATE_NAME,
      basePdfPath: 'assets/templates/wpc_receipt.pdf',
      pageWidth: 612,
      pageHeight: 792,
      mediaBoxOffsetY: 7.92,
      fieldMappingJson: FIELD_MAPPING,
      numberFormat: 'REC-{YYYY}-{NNNN}',
      isActive: true,
    };

    const existing = await prisma.receiptTemplate.findFirst({
      where: { companyProfileId, name: TEMPLATE_NAME },
    });
    const tpl = existing
      ? await prisma.receiptTemplate.update({ where: { id: existing.id }, data })
      : await prisma.receiptTemplate.create({ data: { companyProfileId, ...data } });

    console.log(
      `ReceiptTemplate ${existing ? 'updated' : 'created'}: ${tpl.name} (${tpl.id}) ` +
        `for ${company.companyName} (${companyProfileId})`,
    );
    await prisma.$disconnect();
  } catch (e) {
    console.error('RECEIPT_TEMPLATE_SEED_ERROR:', e.message);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
