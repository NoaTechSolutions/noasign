// FASE 2 e2e helper (CONTRACT path) — create a CONSTRUCTION_CONTRACT draft, send
// it (BoldSign create with DisableEmails:true + OUR signing-invitation email via
// Resend), addressed to Resend's bounce simulator (bounced@resend.dev), then poll
// the document until the async bounce webhook flips it to SEND_FAILED.
//
// The contract invitation is sent through Resend (EmailService.sendSigningInvitation
// → resend.emails.send → providerEmailId), NOT BoldSign (DisableEmails:true), so the
// same Resend bounce webhook that covers receipts covers contracts.
//
// ⚠️ Each run creates a REAL BoldSign document (BOLDSIGN_API_KEY is live locally).
//
// PREREQUISITES (already set up during the receipt test — reuse as-is):
//   - Backend running with RESEND_API_KEY + RESEND_WEBHOOK_SECRET.
//   - cloudflared tunnel up + Resend webhook (email.bounced) → tunnel/webhooks/resend.
//
// USAGE (from apps/backend):
//   node scripts/test-bounce-contract.mjs

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const email = process.env.EMAIL ?? 'jane.smith@test.ntssign.com';
const password = process.env.PASSWORD ?? 'Jane1234!';
const recipient = process.env.RECIPIENT ?? 'bounced@resend.dev';
const pollMs = Number(process.env.POLL_MS ?? 5000);
const timeoutMs = Number(process.env.TIMEOUT_MS ?? 120000);

// jane.smith / World Pavers CONSTRUCTION_CONTRACT fixture (from the live DB).
const fixture = {
  documentTypeId:
    process.env.DOCUMENT_TYPE_ID ?? 'a6e36562-c0d5-4857-a4f8-f92ddc245597',
  formDefinitionId:
    process.env.FORM_DEFINITION_ID ?? 'fa4b20cb-ca48-4225-b5c8-f12ab51d5121',
  signatureTemplateId:
    process.env.SIGNATURE_TEMPLATE_ID ?? '24ecb135-10a4-4579-9204-fe9c9c43e62a',
};

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

  console.log(`→ Creating CONSTRUCTION_CONTRACT draft (recipient ${recipient})`);
  const created = await request('POST', '/documents/draft', {
    expectedStatus: 201,
    body: {
      ...fixture,
      contractDate: new Date().toISOString().slice(0, 10),
      dataJson: {
        customer_name: 'Bounce Test Signer',
        customer_email: recipient, // → buildSignatureRecipient → invitation "to"
        customer_address: '123 Bounce St',
        city: 'Richmond',
        state: 'CA',
        zip: '94801',
        contact_full_name: 'Jane Smith',
      },
    },
  });

  const documentId = created.data.document.id;
  console.log(
    `  Draft created: ${documentId} (status ${created.data.document.status})`,
  );

  console.log('→ Sending (BoldSign create + Resend invitation)…');
  const sent = await request('POST', `/documents/${documentId}/send`, {
    expectedStatus: 201,
  });
  console.log(`  Send result: status=${sent.data.document.status}`);

  // The send response may not surface providerEmailId — read it off the detail.
  const detail = await request('GET', `/documents/${documentId}`, {
    expectedStatus: 200,
  });
  console.log('  After send:', {
    status: detail.data.status,
    providerEmailId: detail.data.providerEmailId ?? null,
    sendError: detail.data.sendError ?? null,
  });

  if (detail.data.status === 'SEND_FAILED') {
    console.log('\n✅ SUCCESS — already SEND_FAILED right after send.');
    console.log(`   sendError: ${detail.data.sendError}`);
    return;
  }

  if (!detail.data.providerEmailId) {
    console.log(
      '\n⚠️  No providerEmailId captured — the Resend invitation may not have been sent',
    );
    console.log(
      '   (contract sync send failures are swallowed as non-fatal). Cannot correlate a bounce. Aborting poll.',
    );
    return;
  }

  console.log(
    `\n→ Polling GET /documents/${documentId} every ${pollMs / 1000}s for the async bounce (up to ${timeoutMs / 1000}s)…`,
  );
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(pollMs);
    const { data } = await request('GET', `/documents/${documentId}`, {
      expectedStatus: 200,
    });
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] status=${data.status} sendError=${data.sendError ?? '—'}`);
    if (data.status === 'SEND_FAILED') {
      console.log('\n✅ SUCCESS — async bounce detected. Contract flipped to SEND_FAILED.');
      console.log(`   sendError: ${data.sendError}`);
      return;
    }
  }
  console.log(
    '\n⌛ Timed out waiting for the bounce. Check: tunnel up, Resend webhook registered, RESEND_WEBHOOK_SECRET matches.',
  );
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
