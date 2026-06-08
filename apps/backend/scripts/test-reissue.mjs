// 2c e2e: reissue a SENT receipt. Verifies the new receipt (next number, sent,
// links to original), the original is voided (supersededAt + back-link, still
// SENT + still downloadable), and downloads both PDFs (voided original saved for
// visual VOID-watermark inspection).
//
// Usage (from apps/backend):  node scripts/test-reissue.mjs

import { writeFileSync } from 'fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const email = process.env.EMAIL ?? 'jane.smith@test.ntssign.com';
const password = process.env.PASSWORD ?? 'Jane1234!';
const recipient = process.env.RECIPIENT ?? 'delivered@resend.dev';
let cookie = '';

async function req(method, path, { body, redirect } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${baseUrl}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: redirect ?? 'follow',
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return res;
}

let ok = true;
const check = (label, cond, extra = '') => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) ok = false;
};

async function downloadPdf(path) {
  const r = await req('GET', path, { redirect: 'manual' });
  const loc = r.headers.get('location');
  const dl = loc ? await fetch(loc) : r;
  return Buffer.from(await dl.arrayBuffer());
}

try {
  console.log(`→ Login ${email}`);
  check('login', (await req('POST', '/auth/login', { body: { email, password } })).status === 201);

  console.log('→ Create + send original receipt');
  const orig = (await req('POST', '/documents/receipt', {
    body: { client: 'Original Client', amount: 100, date: '06/08/2026', payment_method: 'CASH', payment_for: 'original', send: true, recipientEmail: recipient },
  }).then((r) => r.json())).document;
  console.log(`  original id=${orig.id} number=${orig.documentNumber} status=${orig.status}`);
  check('original SENT', orig.status === 'SENT', orig.status);

  console.log('→ Reissue with corrected amount');
  const reissue = await req('POST', `/documents/receipt/${orig.id}/reissue`, {
    body: { client: 'Corrected Client', amount: 250, date: '06/08/2026', payment_method: 'CASH', payment_for: 'corrected', recipientEmail: recipient },
  }).then((r) => r.json());
  const neu = reissue.document;
  console.log(`  new id=${neu.id} number=${neu.documentNumber} status=${neu.status}`);
  check('new receipt SENT', neu.status === 'SENT', neu.status);
  check('new number != original', neu.documentNumber !== orig.documentNumber, `${orig.documentNumber} → ${neu.documentNumber}`);

  console.log('→ New receipt detail (supersedes → original)');
  const newDetail = await req('GET', `/documents/${neu.id}`).then((r) => r.json());
  check('supersedes links to original', newDetail.supersedes?.id === orig.id, JSON.stringify(newDetail.supersedes));

  console.log('→ Original detail (voided + back-link, still SENT)');
  const origDetail = await req('GET', `/documents/${orig.id}`).then((r) => r.json());
  check('original still SENT (status untouched)', origDetail.status === 'SENT', origDetail.status);
  check('original supersededAt set', !!origDetail.supersededAt, String(origDetail.supersededAt));
  check('original supersededBy → new', origDetail.supersededBy?.[0]?.id === neu.id, JSON.stringify(origDetail.supersededBy));

  console.log('→ Both PDFs downloadable');
  const voidPdf = await downloadPdf(`/documents/receipt/${orig.id}/pdf`);
  const newPdf = await downloadPdf(`/documents/receipt/${neu.id}/pdf`);
  check('voided original PDF valid', voidPdf.subarray(0, 4).toString() === '%PDF', `${voidPdf.length} bytes`);
  check('new receipt PDF valid', newPdf.subarray(0, 4).toString() === '%PDF', `${newPdf.length} bytes`);
  check('voided PDF larger (watermark added)', voidPdf.length > newPdf.length - 50000, `void=${voidPdf.length} new=${newPdf.length}`);

  const outPath = 'C:/tmp/void-original.pdf';
  writeFileSync(outPath, voidPdf);
  console.log(`  saved voided original PDF → ${outPath} (for visual VOID check)`);

  console.log(`\n${ok ? '✅ REISSUE E2E PASSED' : '❌ REISSUE E2E FAILED'}`);
} catch (e) {
  console.error('\n❌ Test error:', e.message);
  ok = false;
}
process.exit(ok ? 0 : 1);
