// R2 PDF persistence e2e (receipt path). Creates a receipt (send=false → no
// email needed), then hits GET /documents/receipt/:id/pdf expecting a 302 to a
// presigned R2 URL, follows it, and verifies real PDF bytes come back. Also
// checks the DocumentFile row was recorded.
//
// Usage (from apps/backend):  node scripts/test-r2-receipt.mjs

import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const email = process.env.EMAIL ?? 'jane.smith@test.ntssign.com';
const password = process.env.PASSWORD ?? 'Jane1234!';
let cookie = '';

async function req(method, path, { body, redirect } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: redirect ?? 'follow',
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return res;
}

const prisma = new PrismaClient();
let ok = true;
const check = (label, cond, extra = '') => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) ok = false;
};

try {
  console.log(`→ Login ${email} @ ${baseUrl}`);
  const login = await req('POST', '/auth/login', { body: { email, password } });
  check('login 201', login.status === 201, `got ${login.status}`);

  console.log('→ Create receipt (send=false)');
  const createRes = await req('POST', '/documents/receipt', {
    body: {
      client: 'R2 Test Client',
      amount: 99.99,
      date: new Date().toISOString().slice(0, 10),
      payment_method: 'CASH',
      payment_for: 'R2 persistence e2e',
      send: false,
    },
  });
  check('create 201', createRes.status === 201, `got ${createRes.status}`);
  const { document } = await createRes.json();
  const id = document.id;
  console.log(`  receipt id: ${id}`);

  // The local PrismaClient only reaches the LOCAL DB. For a remote target
  // (staging) we can't query its DB — the 302→presigned→PDF chain below proves
  // the DocumentFile + upload happened regardless.
  const isLocal = /127\.0\.0\.1|localhost/.test(baseUrl);
  if (isLocal) {
    console.log('→ DocumentFile row (provider R2)');
    const file = await prisma.documentFile.findFirst({
      where: { documentId: id, fileType: 'RECEIPT' },
    });
    check('DocumentFile exists', !!file);
    check('provider = R2', file?.provider === 'R2', file?.provider);
    check('storageUrl is a receipts/ key', !!file?.storageUrl?.startsWith('receipts/'), file?.storageUrl);
  } else {
    console.log('→ DocumentFile DB check skipped (remote target — no DB access)');
  }

  // The endpoint streams the R2-stored bytes through the backend (same-origin)
  // so the in-app iframe viewer can read them — NOT a 302 to a presigned R2 URL
  // (R2 has no CORS, which would blank the viewer's blob fetch).
  console.log('→ GET /documents/receipt/:id/pdf (expect 200 streamed PDF)');
  const pdfRes = await req('GET', `/documents/receipt/${id}/pdf`);
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  check('200 OK', pdfRes.status === 200, `got ${pdfRes.status}`);
  check('content-type application/pdf', (pdfRes.headers.get('content-type') || '').includes('application/pdf'));
  check('body is a PDF (%PDF header)', buf.subarray(0, 4).toString() === '%PDF', `${buf.length} bytes`);

  console.log(`\n${ok ? '✅ R2 RECEIPT E2E PASSED' : '❌ R2 RECEIPT E2E FAILED'}`);
} catch (e) {
  console.error('\n❌ Test error:', e.message);
  ok = false;
} finally {
  await prisma.$disconnect();
}
process.exit(ok ? 0 : 1);
