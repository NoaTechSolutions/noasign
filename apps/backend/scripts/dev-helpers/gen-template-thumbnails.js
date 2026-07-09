/**
 * Generate CROPPED PNG preview thumbnails for the RECEIPT catalog templates.
 *
 *   node scripts/dev-helpers/gen-template-thumbnails.js
 *
 * For each active RECEIPT ReceiptTemplateStandard it renders a SAMPLE PDF with
 * the SAME production engine (ReceiptPdfService) + example data, rasterizes page
 * 1 to a PNG, then AUTO-CROPS to the receipt band and writes it to
 * assets/templates/previews/<slug>.png. The Templates screen serves these via
 * GET /templates/previews/:slug (public).
 *
 * Auto-crop (per-design, zero config): scans the rendered page for non-white
 * pixels to find the content bounding box, and drops the ntssign branding footer
 * by cutting at the largest white gap that still has content below it. Works for
 * any design (each receipt sits in a different vertical band) — no manual
 * coordinates. Requires a prior build (uses dist/receipts/receipt-pdf.service).
 * Reads DATABASE_URL from .env via dotenv (never printed). Idempotent.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReceiptPdfService } = require('../../dist/receipts/receipt-pdf.service');

const prisma = new PrismaClient();
const OUT_DIR = path.resolve(process.cwd(), 'assets/templates/previews');
const SCALE = 2; // rasterization scale; higher = crisper cropped band

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

// Crop a full-page PNG to the receipt content band. Returns a PNG Buffer.
async function cropToReceipt(pngBuffer) {
  const img = await loadImage(pngBuffer);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;

  // A pixel is "background" only if it is essentially pure white (so light
  // tinted panel backgrounds still count as receipt content).
  const isContent = (i) =>
    data[i + 3] > 10 &&
    !(data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250);

  const rowContent = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    let c = 0;
    for (let x = 0; x < W; x++) if (isContent((y * W + x) * 4)) c++;
    rowContent[y] = c;
  }
  const rowThresh = Math.max(2, Math.floor(W * 0.004));

  let top = 0;
  while (top < H && rowContent[top] <= rowThresh) top++;
  let bottom = H - 1;
  while (bottom > top && rowContent[bottom] <= rowThresh) bottom--;
  if (top >= bottom) return pngBuffer; // no content — keep original

  // Drop the footer: find the largest white gap (within the content span) that
  // still has content below it, and cut the receipt at its top edge.
  const gapMin = Math.floor(H * 0.03);
  let bestGapLen = 0;
  let bestGapStart = -1;
  let y = top;
  while (y <= bottom) {
    if (rowContent[y] <= rowThresh) {
      const start = y;
      while (y <= bottom && rowContent[y] <= rowThresh) y++;
      const len = y - start;
      const hasContentBelow = y <= bottom;
      if (hasContentBelow && len > bestGapLen) {
        bestGapLen = len;
        bestGapStart = start;
      }
    } else {
      y++;
    }
  }
  if (bestGapStart > 0 && bestGapLen >= gapMin) bottom = bestGapStart - 1;

  // Left/right bounds within the retained [top, bottom] band.
  const colThresh = Math.max(2, Math.floor((bottom - top + 1) * 0.004));
  const colContent = new Array(W).fill(0);
  for (let yy = top; yy <= bottom; yy++) {
    for (let x = 0; x < W; x++) if (isContent((yy * W + x) * 4)) colContent[x]++;
  }
  let left = 0;
  while (left < W && colContent[left] <= colThresh) left++;
  let right = W - 1;
  while (right > left && colContent[right] <= colThresh) right--;
  if (left >= right) {
    left = 0;
    right = W - 1;
  }

  const pad = Math.round(Math.min(W, H) * 0.015);
  const cx = Math.max(0, left - pad);
  const cy = Math.max(0, top - pad);
  const cw = Math.min(W - 1, right + pad) - cx + 1;
  const chh = Math.min(H - 1, bottom + pad) - cy + 1;

  const out = createCanvas(cw, chh);
  out.getContext('2d').drawImage(img, -cx, -cy);
  return out.toBuffer('image/png');
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
      const doc = await pdf(buffer, { scale: SCALE });
      const fullPage = await doc.getPage(1);
      const cropped = await cropToReceipt(fullPage);
      const outPath = path.join(OUT_DIR, `${s.slug}.png`);
      fs.writeFileSync(outPath, cropped);
      console.log(`thumbnail: ${s.slug}.png (${cropped.length} bytes, cropped)`);
    }

    await prisma.$disconnect();
    console.log(`\nDone → ${OUT_DIR}`);
  } catch (e) {
    console.error('THUMBNAIL_GEN_ERROR:', e && e.stack ? e.stack : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
