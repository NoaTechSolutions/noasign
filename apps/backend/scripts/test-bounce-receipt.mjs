// FASE 2 e2e helper — create a receipt and email it to Resend's bounce
// simulator (bounced@resend.dev), then poll the document until the async
// bounce webhook flips it to SEND_FAILED.
//
// PREREQUISITES (owner-provided, see LISTA B):
//   - Backend running on BASE_URL with RESEND_API_KEY set (real send).
//   - RESEND_WEBHOOK_SECRET set + a Resend webhook (email.bounced) pointing at
//     the public tunnel URL → /webhooks/resend.
//   - A user with an active ReceiptTemplate. Defaults to jane.smith (World
//     Pavers). Override with EMAIL / PASSWORD env vars.
//
// USAGE (from apps/backend):
//   node scripts/test-bounce-receipt.mjs
//   BASE_URL=http://127.0.0.1:3000 EMAIL=... PASSWORD=... node scripts/test-bounce-receipt.mjs

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const email = process.env.EMAIL ?? 'jane.smith@test.ntssign.com';
const password = process.env.PASSWORD ?? 'Jane1234!';
const recipient = process.env.RECIPIENT ?? 'bounced@resend.dev';
const pollMs = Number(process.env.POLL_MS ?? 5000);
const timeoutMs = Number(process.env.TIMEOUT_MS ?? 120000);

let authCookie = '';

async function request(method, path, { body, expectedStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authCookie) headers.Cookie = authCookie;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) authCookie = setCookie.split(';')[0];

  if (expectedStatus && res.status !== expectedStatus) {
    throw new Error(
      `${method} ${path} → ${res.status} (expected ${expectedStatus}): ${text}`,
    );
  }
  if (!expectedStatus && !res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return { status: res.status, data };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`→ Logging in as ${email} @ ${baseUrl}`);
  await request('POST', '/auth/login', {
    expectedStatus: 201,
    body: { email, password },
  });

  console.log(`→ Creating receipt, emailing to ${recipient}`);
  const created = await request('POST', '/documents/receipt', {
    expectedStatus: 201,
    body: {
      client: 'Bounce Test Client',
      amount: 123.45,
      date: new Date().toISOString().slice(0, 10),
      payment_method: 'CASH',
      payment_for: 'FASE 2 bounce e2e test',
      send: true,
      recipientEmail: recipient,
    },
  });

  const doc = created.data.document;
  console.log('  Receipt created:', {
    id: doc.id,
    status: doc.status,
    providerEmailId: doc.providerEmailId ?? null,
    sendError: created.data.sendError ?? null,
  });

  if (doc.status === 'SEND_FAILED') {
    console.log(
      '\n⚠️  Receipt is already SEND_FAILED on the synchronous path (FASE 1).',
    );
    console.log(
      '   This means the send was rejected immediately, NOT an async bounce.',
    );
    console.log(
      '   Check RESEND_API_KEY is set so the send actually reaches Resend.',
    );
    return;
  }

  if (!doc.providerEmailId) {
    console.log(
      '\n⚠️  No providerEmailId captured — Resend may be disabled (no RESEND_API_KEY). Aborting poll.',
    );
    return;
  }

  console.log(
    `\n→ Polling GET /documents/${doc.id} every ${pollMs / 1000}s for the async bounce (up to ${timeoutMs / 1000}s)...`,
  );
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(pollMs);
    const { data } = await request('GET', `/documents/${doc.id}`, {
      expectedStatus: 200,
    });
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] status=${data.status} sendError=${data.sendError ?? '—'}`);
    if (data.status === 'SEND_FAILED') {
      console.log('\n✅ SUCCESS — async bounce detected. Document flipped to SEND_FAILED.');
      console.log(`   sendError: ${data.sendError}`);
      return;
    }
  }
  console.log(
    '\n⌛ Timed out waiting for the bounce. Check: webhook is registered in Resend, tunnel is up, RESEND_WEBHOOK_SECRET matches the endpoint secret.',
  );
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
