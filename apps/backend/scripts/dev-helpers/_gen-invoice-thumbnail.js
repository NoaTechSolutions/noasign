// LOCAL dev-helper (untracked): generate ONLY the invoice-standard-v1 preview PNGs
// (card <slug>.png + modal <slug>-full.png) with the AcroForm-overlay engine.
// Deliberately does NOT touch the RECEIPT previews (never run gen-template-thumbnails
// — it overwrites the owner's hand-made receipt PNGs).
//   node scripts/dev-helpers/_gen-invoice-thumbnail.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { ReceiptPdfService } = require('../../dist/receipts/receipt-pdf.service');

const prisma = new PrismaClient();
const OUT_DIR = path.resolve(process.cwd(), 'assets/templates/previews');
const SLUG = 'invoice-standard-v1';

// Sample data in the SAME shape the create adapter feeds the engine (no "$" — the
// base art prints it).
const SAMPLE = {
  billed_to: 'World Pavers\n1420 Garden Avenue\nMiami, FL 33101',
  number: '0007',
  date: '07/09/2026',
  service: 'Acoustic Performance\nEvent Date: 07/09/2026\nEvent Name: Summer Gala 2026\nEvent Location: Miami, FL',
  quantity: '1',
  price: '4,500.00',
  total: '4,500.00',
  subtotal: '4,500.00',
  gran_total: '4,500.00',
};

(async () => {
  try {
    const std = await prisma.receiptTemplateStandard.findUnique({ where: { slug: SLUG } });
    if (!std) throw new Error(`${SLUG} not seeded`);
    const engine = new ReceiptPdfService();
    const buffer = await engine.generateFromAcroFormOverlay(std, SAMPLE);
    const { pdf } = await import('pdf-to-img');
    const doc = await pdf(buffer, { scale: 2 });
    const page = await doc.getPage(1);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    // Invoice is an edge-to-edge full-page design, so the card thumbnail and the
    // modal both use the full page (no crop band like receipts).
    fs.writeFileSync(path.join(OUT_DIR, `${SLUG}-full.png`), page);
    fs.writeFileSync(path.join(OUT_DIR, `${SLUG}.png`), page);
    console.log(`Wrote ${SLUG}.png + ${SLUG}-full.png (${page.length}b) -> ${OUT_DIR}`);
    await prisma.$disconnect();
  } catch (e) {
    console.error('THUMB_ERROR:', e && e.stack ? e.stack : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
