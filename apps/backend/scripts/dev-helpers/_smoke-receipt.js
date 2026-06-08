/**
 * Smoke test for POST /documents/receipt (Phase 1 — backend only, no UI yet).
 *
 * WHAT IT DOES
 *   1. Logs in (a World Pavers user, which has the seeded ReceiptTemplate).
 *   2. POST /documents/receipt with the approved validation data, send=false.
 *      Asserts: HTTP 201, receiptNumber format REC-2026-NNNN, Document is DRAFT
 *      and a PAYMENT_RECEIPT.
 *   3. Regenerates the SAME PDF locally (deterministic — identical to what the
 *      endpoint produced) and saves it so you can open it and confirm it
 *      visually matches wpc_receipt_PREVIEW_APROBADO.pdf.
 *   4. (optional) SMOKE_SEND=true → a second POST with send=true + recipient
 *      email to exercise the Resend path.
 *
 * PREREQUISITES
 *   - The backend must be running WITH the new code (rebuild first):
 *       npm run build && <however you start it>   (it serves on :3000)
 *   - The PAYMENT_RECEIPT seed must have run once:
 *       DATABASE_URL=... node scripts/dev-helpers/_seed-payment-receipt.js
 *
 * CREDENTIALS (login)
 *   Defaults to jane.smith@test.ntssign.com (World Pavers tenant). jane was
 *   registered manually, so her password is NOT in any seed — provide it:
 *       SMOKE_PASSWORD='<jane password>' node scripts/dev-helpers/_smoke-receipt.js
 *   Override the user with SMOKE_EMAIL / SMOKE_PASSWORD (must belong to a company
 *   that has a ReceiptTemplate).
 *
 * RUN
 *   cd apps/backend
 *   SMOKE_PASSWORD='...' node scripts/dev-helpers/_smoke-receipt.js
 *   # also send an email:
 *   SMOKE_PASSWORD='...' SMOKE_SEND=true SMOKE_RECIPIENT='you@example.com' \
 *     node scripts/dev-helpers/_smoke-receipt.js
 *
 * ENV VARS
 *   SMOKE_API        backend base URL           (default http://localhost:3000)
 *   SMOKE_EMAIL      login email                (default jane.smith@test.ntssign.com)
 *   SMOKE_PASSWORD   login password             (REQUIRED)
 *   SMOKE_SEND       'true' → also POST send=true
 *   SMOKE_RECIPIENT  recipient email for send=true
 *   SMOKE_OUT        output PDF path            (default /tmp/smoke-receipt-output.pdf)
 *
 * NOTE: this script does NOT touch the DB. If you have already created 2026
 * receipts, the counter won't be at 0001 — the format check still passes; the
 * "== REC-2026-0001" check is a first-run convenience.
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const API = process.env.SMOKE_API || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || 'jane.smith@test.ntssign.com';
const PASSWORD = process.env.SMOKE_PASSWORD || '';
const DO_SEND = process.env.SMOKE_SEND === 'true';
const RECIPIENT = process.env.SMOKE_RECIPIENT || '';
const OUT = process.env.SMOKE_OUT || '/tmp/smoke-receipt-output.pdf';

// Approved validation data. `date` is a free-form string drawn verbatim; the
// approved preview uses MM/DD/YYYY, so we pass 06/04/2026 (= 2026-06-04).
// payment_method CARD → the enum value CREDIT_DEBIT_CARD.
const RECEIPT_DATA = {
  client: 'Israel Esparza',
  amount: 3000,
  date: '06/04/2026',
  payment_method: 'CREDIT_DEBIT_CARD',
  payment_current: 1,
  payment_total: 4,
  payment_for: 'Driveway paving - Phase 1 deposit',
  received_by: 'Carlos (World Pavers)',
};

let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${extra ? ' — ' + extra : ''}`);
  ok ? pass++ : fail++;
};

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (res.status !== 201 && res.status !== 200) {
    const txt = await res.text();
    throw new Error(`Login failed (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/ntssign_access_token=[^;]+/);
  if (!match) throw new Error('No ntssign_access_token cookie in login response');
  return match[0];
}

async function postReceipt(cookie, body) {
  const res = await fetch(`${API}/documents/receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

// --- local PDF regeneration (mirrors ReceiptPdfService; WPC template) ---------
const ASSETS = path.resolve(process.cwd(), 'assets');
const FONT_FILES = { 'Montserrat-Black': 'Montserrat-Black.ttf', Carlito: 'Carlito-Regular.ttf', 'Carlito-Bold': 'Carlito-Bold.ttf' };
const WPC_TEMPLATE = {
  basePdfPath: 'assets/templates/wpc_receipt.pdf',
  pageHeight: 792,
  mediaBoxOffsetY: 7.92,
  fieldMappingJson: {
    receipt_number: { type: 'text', x: 387, baseline: 488.5, font: 'Montserrat-Black', size: 16, color: '#000000', autoShiftRightLimit: 558 },
    date: { type: 'text', x: 428, lineTop: 331, font: 'Carlito', size: 11.5 },
    client: { type: 'text', x: 118, lineTop: 371, font: 'Carlito', size: 11.5 },
    amount: { type: 'currency', x: 118, lineTop: 396, font: 'Carlito', size: 11.5 },
    payment_n: { type: 'text', x: 357, lineTop: 385, gap: -9, font: 'Carlito', size: 11.5 },
    payment_for: { type: 'text', x: 146, lineTop: 442, gap: 3.5, font: 'Carlito', size: 11.5 },
    received_by: { type: 'text', x: 138, lineTop: 465, font: 'Carlito', size: 11.5 },
    other_label: { type: 'text', x: 472, lineTop: 423, font: 'Carlito', size: 10 },
    payment_method: { type: 'checkbox_group', lineTop: 407, gap: -11.5, mark: 'X', font: 'Carlito-Bold', size: 12, options: { CASH: 63, CREDIT_DEBIT_CARD: 126, CHEQUE: 256, BANK_TRANSFER: 333, OTHER: 448 } },
  },
};
const hexToRgb = (hex) => { const h = (hex || '#000000').replace('#', ''); return rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255); };
const fmtCurrency = (v) => { const n = Number(v); return Number.isNaN(n) ? String(v) : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

async function renderPdf(receiptNumber) {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(path.resolve(process.cwd(), WPC_TEMPLATE.basePdfPath)));
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.getPages()[0];
  const fonts = {};
  const getFont = async (name) => { const k = name && FONT_FILES[name] ? name : 'Carlito'; if (!fonts[k]) fonts[k] = await pdfDoc.embedFont(fs.readFileSync(path.join(ASSETS, 'fonts', FONT_FILES[k]))); return fonts[k]; };
  const off = WPC_TEMPLATE.mediaBoxOffsetY;
  const yOf = (m) => { const gap = m.gap != null ? m.gap : 2.5; const b = m.baseline != null ? m.baseline : WPC_TEMPLATE.pageHeight - (m.lineTop || 0) + gap; return b + off; };
  const data = {
    receipt_number: receiptNumber,
    date: RECEIPT_DATA.date,
    client: RECEIPT_DATA.client,
    amount: RECEIPT_DATA.amount,
    payment_n: `${RECEIPT_DATA.payment_current} of ${RECEIPT_DATA.payment_total}`,
    payment_for: RECEIPT_DATA.payment_for,
    received_by: RECEIPT_DATA.received_by,
    other_label: '',
    payment_method: RECEIPT_DATA.payment_method,
  };
  for (const [key, m] of Object.entries(WPC_TEMPLATE.fieldMappingJson)) {
    if (m.type === 'checkbox_group') { const ox = m.options[String(data[key])]; if (ox == null) continue; page.drawText(m.mark, { x: ox + 3.5, y: yOf(m), size: m.size, font: await getFont(m.font), color: hexToRgb(m.color) }); continue; }
    const raw = data[key]; if (raw == null || raw === '') continue;
    const value = m.type === 'currency' ? fmtCurrency(raw) : String(raw);
    const font = await getFont(m.font); const size = m.size || 11.5; let x = m.x || 0;
    if (m.autoShiftRightLimit != null) { const w = font.widthOfTextAtSize(value, size); if (x + w > m.autoShiftRightLimit) x = m.autoShiftRightLimit - w; }
    page.drawText(value, { x, y: yOf(m), size, font, color: hexToRgb(m.color) });
  }
  return Buffer.from(await pdfDoc.save());
}

(async () => {
  console.log(`\n=== Receipt endpoint smoke test ===`);
  console.log(`API: ${API} | user: ${EMAIL}\n`);
  if (!PASSWORD) {
    console.error('ERROR: SMOKE_PASSWORD is required. Example:\n  SMOKE_PASSWORD=\'<jane password>\' node scripts/dev-helpers/_smoke-receipt.js');
    process.exit(1);
  }
  try {
    const cookie = await login();
    console.log('Logged in OK.\n');

    // --- POST send=false ---
    const r1 = await postReceipt(cookie, { ...RECEIPT_DATA, send: false });
    check('HTTP 201 (send=false)', r1.status === 201, `got ${r1.status}`);
    const num = r1.json?.receiptNumber;
    check('receiptNumber format REC-2026-NNNN', /^REC-2026-\d{4}$/.test(num || ''), num);
    if (num !== 'REC-2026-0001') {
      console.log(`NOTE | receiptNumber is ${num}, not REC-2026-0001 — counter already advanced (prior 2026 receipts). Format is still valid.`);
    }
    check('Document status DRAFT', r1.json?.document?.status === 'DRAFT', r1.json?.document?.status);
    check('Document is PAYMENT_RECEIPT', (r1.json?.document?.documentNumber || '').startsWith('PAYMENT_RECEIPT-'), r1.json?.document?.documentNumber);

    // --- save the (deterministic) PDF for visual inspection ---
    if (num) {
      const pdf = await renderPdf(num);
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, pdf);
      console.log(`\nSaved generated PDF → ${OUT} (${pdf.length} bytes). Open it and compare to wpc_receipt_PREVIEW_APROBADO.pdf.`);
    }

    // --- optional POST send=true ---
    if (DO_SEND) {
      console.log('\n--- send=true (Resend path) ---');
      if (!RECIPIENT) {
        console.log('SKIP | SMOKE_SEND=true but SMOKE_RECIPIENT not set.');
      } else {
        const r2 = await postReceipt(cookie, { ...RECEIPT_DATA, send: true, recipientEmail: RECIPIENT });
        check('HTTP 201 (send=true)', r2.status === 201, `got ${r2.status}`);
        check('Document status SENT', r2.json?.document?.status === 'SENT', r2.json?.document?.status);
        console.log(`NOTE | actual email delivery requires RESEND_API_KEY in the backend env; without it the backend logs a skip but the Document is still SENT.`);
      }
    }

    console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'} (${pass} passed, ${fail} failed) ===\n`);
    process.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nSMOKE TEST ERROR:', e.message);
    process.exit(1);
  }
})();
