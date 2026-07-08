/**
 * Idempotent seed of the STANDARD template catalog (global, shared across tenants).
 *
 *   DATABASE_URL=... node scripts/seed-template-catalog.js
 *
 * RECEIPTS: upserts the standard receipt design(s) into ReceiptTemplateStandard.
 * Ships the one validated design today (WPC "Classic"); the owner adds the other
 * standard receipts as new rows of the same shape once their base PDFs +
 * coordinates are ready (see docs / the onboarding relevamiento).
 *
 * CONTRACTS: SignatureTemplate already IS the global catalog. Best-effort, this
 * tags an existing active global (companyProfileId null) contract template as a
 * standard catalog entry (isStandard + slug + isDefault) so contracts have a
 * standard locally too. Owner-created BoldSign templates become standards the
 * same way (set isStandard=true + a slug).
 *
 * Additive/idempotent: upserts by slug, never deletes.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// enum -> friendly label for payment_method drawn as TEXT (moderno / basic-v2).
// basic-v1 draws it as a checkbox instead, so it doesn't need labels.
const METHOD_LABELS = {
  CASH: 'Cash',
  CREDIT_DEBIT_CARD: 'Credit/Debit Card',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  ZELLE: 'Zelle',
  OTHER: 'Other',
};

// The 3 owner-designed standard receipts (US Letter, 612x792). Coordinates are
// hand-calibrated per design via _calibrate-receipt.js (render + compare) against
// the PRODUCTION engine. NOTE: these base PDFs were exported with an unbalanced
// content-stream transform (a horizontal scale on stamped content, unlike the
// WPC base), so the x values here are calibrated to THIS base as-is — re-export a
// base and its slug's coordinates must be re-calibrated. Single shared series
// number: numberFormat "{NNNN}" (0001, 4 digits). Signature slots are left empty
// (Phase 3 — business-owner signature). WPC 'receipt-classic' kept as a non-
// default legacy standard.
const WPC_FIELD_MAPPING = {
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

const RECEIPT_STANDARDS = [
  {
    slug: 'receipt-basic-v1',
    name: 'Basic (checkboxes)',
    description: 'Classic receipt with payment-method checkboxes. Zelle marks "Other".',
    basePdfPath: 'assets/templates/receipt-basic-v1.pdf',
    numberFormat: 'N° {NNNN}',
    isDefault: true,
    fieldMappingJson: {
      receipt_number: { type: 'text', x: 428, lineTop: 193, font: 'Montserrat-Black', size: 20, autoShiftRightLimit: 572 },
      client: { type: 'text', x: 158, lineTop: 225, font: 'Carlito', size: 13.5 },
      date: { type: 'text', x: 420, lineTop: 225, font: 'Carlito', size: 13.5 },
      amount: { type: 'currency', x: 138, lineTop: 250, font: 'Carlito', size: 13.5 },
      payment_method: {
        type: 'checkbox_group', lineTop: 273, mark: 'X', font: 'Carlito-Bold', size: 11,
        options: { CASH: 58, CREDIT_DEBIT_CARD: 120, CHEQUE: 253, BANK_TRANSFER: 328, OTHER: 445, ZELLE: 445 },
      },
      other_label: { type: 'text', x: 470, lineTop: 278, font: 'Carlito', size: 13.5 },
      payment_for: { type: 'text', x: 142, lineTop: 320, font: 'Carlito', size: 13.5 },
      received_by: { type: 'text', x: 140, lineTop: 344, font: 'Carlito', size: 13.5 },
    },
  },
  {
    slug: 'receipt-moderno-v1',
    name: 'Moderno (blocks + notes)',
    description: 'Styled block design with a Notes field. Method printed as text.',
    basePdfPath: 'assets/templates/receipt-moderno-v1.pdf',
    numberFormat: 'N° {NNNN}',
    isDefault: false,
    fieldMappingJson: {
      receipt_number: { type: 'text', x: 88, lineTop: 192, font: 'Carlito-Bold', size: 11, color: '#12235c' },
      date: { type: 'text', x: 338, lineTop: 192, font: 'Carlito-Bold', size: 11, color: '#12235c' },
      client: { type: 'text', x: 88, lineTop: 247, font: 'Carlito', size: 11, color: '#12235c' },
      payment_for: { type: 'text', x: 88, lineTop: 300, font: 'Carlito', size: 11, color: '#12235c' },
      amount: { type: 'currency', x: 88, lineTop: 366, font: 'Carlito-Bold', size: 11, color: '#12235c' },
      payment_method: { type: 'text', x: 268, lineTop: 366, font: 'Carlito', size: 10, color: '#12235c', labels: METHOD_LABELS },
      received_by: { type: 'text', x: 442, lineTop: 366, font: 'Carlito', size: 9, color: '#12235c' },
      notes: { type: 'text', x: 88, lineTop: 421, font: 'Carlito', size: 10, color: '#12235c' },
    },
  },
  {
    slug: 'receipt-basic-v2',
    name: 'Minimal',
    description: 'Minimal "Payment Receipt". Method printed as text; large number by the signature.',
    basePdfPath: 'assets/templates/receipt-basic-v2.pdf',
    numberFormat: 'N° {NNNN}',
    isDefault: false,
    fieldMappingJson: {
      client: { type: 'text', x: 158, lineTop: 280, font: 'Carlito', size: 12 },
      payment_for: { type: 'text', x: 138, lineTop: 310, font: 'Carlito', size: 12 },
      date: { type: 'text', x: 465, lineTop: 310, font: 'Carlito', size: 12 },
      amount: { type: 'currency', x: 152, lineTop: 343, font: 'Carlito', size: 12 },
      payment_method: { type: 'text', x: 472, lineTop: 343, font: 'Carlito', size: 11, labels: METHOD_LABELS },
      received_by: { type: 'text', x: 142, lineTop: 371, font: 'Carlito', size: 12 },
      receipt_number: { type: 'text', x: 42, lineTop: 415, font: 'Montserrat-Black', size: 22 },
    },
  },
  {
    slug: 'receipt-classic',
    name: 'Classic (WPC — legacy)',
    description: 'Original World Pavers design. Kept as a non-default legacy standard.',
    basePdfPath: 'assets/templates/wpc_receipt.pdf',
    numberFormat: 'REC-{YYYY}-{NNNN}',
    isDefault: false,
    fieldMappingJson: WPC_FIELD_MAPPING,
  },
].map((s) => ({
  pageWidth: 612,
  pageHeight: 792,
  mediaBoxOffsetY: 7.92,
  isActive: true,
  ...s,
}));

const CONTRACT_STANDARD_SLUG = 'contract-standard-a';

(async () => {
  try {
    // --- Receipts ---
    const receiptType = await prisma.documentType.findUnique({
      where: { code: 'PAYMENT_RECEIPT' },
    });
    for (const s of RECEIPT_STANDARDS) {
      const data = {
        ...s,
        category: 'RECEIPT',
        documentTypeId: receiptType ? receiptType.id : null,
      };
      const up = await prisma.receiptTemplateStandard.upsert({
        where: { slug: s.slug },
        update: data,
        create: data,
      });
      console.log(`ReceiptTemplateStandard upserted: ${up.slug} (${up.id}) default=${up.isDefault}`);
    }

    // --- Contracts (best-effort tag of an existing global template) ---
    const alreadyStd = await prisma.signatureTemplate.findFirst({
      where: { slug: CONTRACT_STANDARD_SLUG },
    });
    if (alreadyStd) {
      console.log(`Contract standard '${CONTRACT_STANDARD_SLUG}' already present (${alreadyStd.id}).`);
    } else {
      const candidate = await prisma.signatureTemplate.findFirst({
        where: { isActive: true, companyProfileId: null, slug: null },
        orderBy: { createdAt: 'asc' },
      });
      if (candidate) {
        const upd = await prisma.signatureTemplate.update({
          where: { id: candidate.id },
          data: { isStandard: true, isDefault: true, slug: CONTRACT_STANDARD_SLUG },
        });
        console.log(`Tagged SignatureTemplate '${upd.name}' (${upd.id}) as standard '${CONTRACT_STANDARD_SLUG}'.`);
      } else {
        console.log("No existing global contract template to tag — owner will create BoldSign templates (set isStandard=true + a slug).");
      }
    }

    await prisma.$disconnect();
  } catch (e) {
    console.error('TEMPLATE_CATALOG_SEED_ERROR:', e.message);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
