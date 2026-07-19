/**
 * Dev-only: render the 3 standard receipt samples straight from the seeded
 * ReceiptTemplateStandard rows via the PRODUCTION engine (validates the seed
 * round-trip). Output → C:/tmp/receipt-samples. Not part of the render path.
 *
 *   DATABASE_URL=... node scripts/dev-helpers/_render-samples.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { ReceiptPdfService } = require('../../dist/receipts/receipt-pdf.service');

const OUT = 'C:/tmp/receipt-samples';
fs.mkdirSync(OUT, { recursive: true });

const TEST_DATA = {
  receipt_number: 'N° 0001', date: '07/07/2026', client: 'Maria Rodriguez',
  amount: 1450.5, payment_n: '2 of 4', payment_for: 'Backyard paver installation — phase 2',
  received_by: 'World Pavers LLC', other_label: 'Venmo', payment_method: 'BANK_TRANSFER',
  notes: 'Balance due on completion. Thank you!', signature_image: 'assets/sample-signature.png',
};

(async () => {
  const prisma = new PrismaClient();
  const pdf = new ReceiptPdfService();
  for (const slug of ['receipt-basic-v1', 'receipt-moderno-v1', 'receipt-basic-v2']) {
    const t = await prisma.receiptTemplateStandard.findUnique({ where: { slug } });
    const num = t.numberFormat.replace('{YYYY}', '2026').replace('{NNNN}', '0001');
    const buf = await pdf.generate(t, { ...TEST_DATA, receipt_number: num });
    const out = path.join(OUT, slug + '_SAMPLE.pdf');
    fs.writeFileSync(out, buf);
    console.log('wrote', out, buf.length);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
