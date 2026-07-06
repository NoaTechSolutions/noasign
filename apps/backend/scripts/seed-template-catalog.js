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

// The one validated receipt design today (WPC). Same hand-measured coordinates
// used by _seed-receipt-template.js — kept in sync intentionally.
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

// Standard receipt catalog. Add more entries here as the owner delivers designs.
const RECEIPT_STANDARDS = [
  {
    slug: 'receipt-classic',
    name: 'Classic Receipt',
    description: 'Default standard payment-receipt design (WPC base PDF).',
    basePdfPath: 'assets/templates/wpc_receipt.pdf',
    pageWidth: 612,
    pageHeight: 792,
    mediaBoxOffsetY: 7.92,
    numberFormat: 'REC-{YYYY}-{NNNN}',
    isActive: true,
    isDefault: true,
    fieldMappingJson: WPC_FIELD_MAPPING,
  },
];

const CONTRACT_STANDARD_SLUG = 'contract-standard-a';

(async () => {
  try {
    // --- Receipts ---
    for (const s of RECEIPT_STANDARDS) {
      const up = await prisma.receiptTemplateStandard.upsert({
        where: { slug: s.slug },
        update: s,
        create: s,
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
