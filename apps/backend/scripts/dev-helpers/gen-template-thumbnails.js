/**
 * Generate PNG preview thumbnails for the RECEIPT catalog templates.
 *
 *   node scripts/dev-helpers/gen-template-thumbnails.js
 *
 * For each active RECEIPT ReceiptTemplateStandard it renders a SAMPLE PDF with
 * the SAME production engine (ReceiptPdfService) + example data, rasterizes page
 * 1 to a PNG, and writes it to assets/templates/previews/<slug>.png. The
 * Templates screen serves these via GET /templates/previews/:slug (public).
 *
 * Requires a prior build (uses dist/receipts/receipt-pdf.service). Reads
 * DATABASE_URL from .env via dotenv (never printed). Idempotent — overwrites.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReceiptPdfService } = require('../../dist/receipts/receipt-pdf.service');

const prisma = new PrismaClient();
const OUT_DIR = path.resolve(process.cwd(), 'assets/templates/previews');

// Realistic sample data covering every field any receipt design maps. Missing
// keys (e.g. signature_image) are simply not drawn — exactly like production.
function sampleData(numberFormat) {
  const receiptNumber = String(numberFormat)
    .replace('{YYYY}', '2026')
    .replace('{NNNN}', '0007');
  return {
    receipt_number: receiptNumber,
    date: '07/09/2026',
    client: 'Laura Bravo',
    amount: 1450.5,
    payment_n: '1 of 3',
    payment_for: 'Backyard paver installation',
    received_by: 'M. Rossi',
    other_label: '',
    payment_method: 'CASH',
    notes: 'Thank you for your business!',
  };
}

(async () => {
  try {
    const { pdf } = await import('pdf-to-img');
    const engine = new ReceiptPdfService();

    const standards = await prisma.receiptTemplateStandard.findMany({
      where: { category: 'RECEIPT', isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    if (standards.length === 0) {
      console.error(
        'No RECEIPT standards found — run scripts/seed-template-catalog.js first.',
      );
      process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const s of standards) {
      const buffer = await engine.generate(s, sampleData(s.numberFormat));
      const doc = await pdf(buffer, { scale: 1.5 });
      const firstPage = await doc.getPage(1);
      const outPath = path.join(OUT_DIR, `${s.slug}.png`);
      fs.writeFileSync(outPath, firstPage);
      console.log(`thumbnail: ${s.slug}.png (${firstPage.length} bytes)`);
    }

    await prisma.$disconnect();
    console.log(`\nDone → ${OUT_DIR}`);
  } catch (e) {
    console.error('THUMBNAIL_GEN_ERROR:', e && e.stack ? e.stack : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
