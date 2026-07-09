/**
 * Dev-only: render the standard invoice sample straight from the seeded
 * ReceiptTemplateStandard row via the PRODUCTION engine, dispatching on renderMode
 * ('acroform' -> generateFromAcroForm; 'overlay' -> generate). Validates the seed +
 * AcroForm round-trip. Output -> C:/tmp/receipt-samples. Not part of the render path.
 *
 *   DATABASE_URL=... node scripts/dev-helpers/_render-invoice-sample.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { ReceiptPdfService } = require('../../dist/receipts/receipt-pdf.service');

const OUT = 'C:/tmp/receipt-samples';
fs.mkdirSync(OUT, { recursive: true });

const DATA = {
  billed_to: 'Laura Bravo\n123 Garden Lane\nMiami, FL 33101',
  date: '07/08/2026',
  service: 'Backyard paver installation — phase 2',
  quantity: '1',
  price: 1450.5,
  total: 1450.5,
  subtotal: 1450.5,
  gran_total: 1450.5,
};

(async () => {
  const prisma = new PrismaClient();
  const pdf = new ReceiptPdfService();
  const t = await prisma.receiptTemplateStandard.findUnique({
    where: { slug: 'invoice-standard-v1' },
  });
  if (!t) throw new Error('invoice-standard-v1 not seeded — run seed-template-catalog.js');
  const number = t.numberFormat.replace('{YYYY}', '2026').replace('{NNNN}', '0001');
  const data = { ...DATA, number };
  const buf =
    t.renderMode === 'acroform'
      ? await pdf.generateFromAcroForm(t, data)
      : await pdf.generate(t, data);
  const out = path.join(OUT, t.slug + '_SAMPLE.pdf');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, buf.length, '| mode=' + t.renderMode, '| number=' + number);
  await prisma.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
