/**
 * Calibration harness for mapping a receipt base PDF (dev-only, not committed to
 * the render path). Two modes:
 *
 *   grid: node _calibrate-receipt.js grid <basePdf> <out.pdf>
 *     Overlays a coordinate grid in the ENGINE's system (x from left, lineTop from
 *     top — the same numbers used in fieldMappingJson). Read off each blank's
 *     (x, lineTop) from the grid.
 *
 *   data: node _calibrate-receipt.js data <basePdf> <mapping.json> <out.pdf>
 *     Renders the base PDF with a fieldMapping + fixed test data via the PRODUCTION
 *     ReceiptPdfService (so what you see IS the production render — this is the
 *     "unify before calibrating" fix: we never use the divergent _smoke script).
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { ReceiptPdfService } = require('../../dist/receipts/receipt-pdf.service');

const TEST_DATA = {
  receipt_number: 'N° 0001',
  date: '07/07/2026',
  client: 'Maria Rodriguez',
  amount: 1450.5,
  payment_n: '2 of 4',
  payment_for: 'Backyard paver installation — phase 2',
  received_by: 'World Pavers LLC',
  other_label: 'Venmo',
  payment_method: 'BANK_TRANSFER',
  notes: 'Balance due on completion. Thank you!',
};

async function grid(baseFile, outFile) {
  const doc = await PDFDocument.load(fs.readFileSync(baseFile));
  const page = doc.getPages()[0];
  const H = page.getHeight();
  const W = page.getWidth();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const line = (x1, y1, x2, y2, c) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.4, color: c });
  // Horizontal lines by lineTop (distance from top). y = H - lineTop.
  for (let lt = 0; lt <= H; lt += 25) {
    const y = H - lt;
    const major = lt % 100 === 0;
    line(0, y, W, y, major ? rgb(0.8, 0.4, 0.4) : rgb(0.85, 0.85, 0.92));
    if (lt % 50 === 0) {
      page.drawText(String(lt), { x: 2, y: y + 1, size: 6, font, color: rgb(0.8, 0.2, 0.2) });
      page.drawText(String(lt), { x: W - 18, y: y + 1, size: 6, font, color: rgb(0.8, 0.2, 0.2) });
    }
  }
  // Vertical lines by x (from left).
  for (let x = 0; x <= W; x += 25) {
    const major = x % 100 === 0;
    line(x, 0, x, H, major ? rgb(0.4, 0.4, 0.8) : rgb(0.85, 0.85, 0.92));
    if (x % 50 === 0) {
      page.drawText(String(x), { x: x + 1, y: H - 10, size: 6, font, color: rgb(0.2, 0.2, 0.8) });
    }
  }
  fs.writeFileSync(outFile, await doc.save());
  console.log('grid written:', outFile);
}

async function data(baseFile, mappingFile, outFile) {
  const fieldMappingJson = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  // Verification helper: MARK_ALL_CHECKBOXES=1 draws a mark in EVERY option of a
  // checkbox_group (so all boxes can be checked at once to confirm alignment).
  if (process.env.MARK_ALL_CHECKBOXES) {
    for (const [key, m] of Object.entries({ ...fieldMappingJson })) {
      if (m.type === 'checkbox_group') {
        let i = 0;
        for (const ox of Object.values(m.options)) {
          const k = `_mk_${key}_${i++}`;
          fieldMappingJson[k] = { type: 'text', x: ox + 3.5, lineTop: m.lineTop, gap: m.gap, font: m.font, size: m.size, color: m.color };
          TEST_DATA[k] = m.mark || 'X';
        }
        delete fieldMappingJson[key];
      }
    }
  }
  const template = {
    basePdfPath: path.relative(process.cwd(), baseFile).replace(/\\/g, '/'),
    pageWidth: 612,
    pageHeight: 792,
    mediaBoxOffsetY: 7.92,
    fieldMappingJson,
  };
  const pdf = new ReceiptPdfService();
  const buf = await pdf.generate(template, TEST_DATA);
  fs.writeFileSync(outFile, buf);
  console.log('data render written:', outFile);
}

(async () => {
  const [mode, base, a, b] = process.argv.slice(2);
  if (mode === 'grid') await grid(base, a);
  else if (mode === 'data') await data(base, a, b);
  else {
    console.error('usage: grid <base> <out> | data <base> <mapping.json> <out>');
    process.exit(1);
  }
})().catch((e) => {
  console.error('CALIBRATE_ERROR:', e.message);
  process.exit(1);
});
