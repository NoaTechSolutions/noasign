/**
 * Seeds 25 CONSTRUCTION_CONTRACT documents for jane.smith (World Pavers) across
 * all 6 states, for visual testing of the Documents panel.
 *
 * Idempotent: each doc has a stable, test-marked number
 * (CONSTRUCTION_CONTRACT-JT-NNN). Re-running skips existing ones. The "-JT-NNN"
 * suffix is non-numeric, so generateDocumentNumber ignores these and they never
 * collide with real sequential numbers. Cleanup: delete where documentNumber
 * startsWith 'CONSTRUCTION_CONTRACT-JT-'.
 *
 * Run: node scripts/dev-helpers/_seed-jane-documents.js
 */
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const JANE_ID = '9f339c28-3cd0-479a-afda-d97af327aa40';
const COMPANY_ID = '7aaad16a-6d76-4c36-97c7-b9ce3e45b801';
const DOC_TYPE_ID = 'a6e36562-c0d5-4857-a4f8-f92ddc245597'; // CONSTRUCTION_CONTRACT
const FORM_DEF_ID = 'fa4b20cb-ca48-4225-b5c8-f12ab51d5121'; // Construction Contract Form
const SIG_TPL_ID = '24ecb135-10a4-4579-9204-fe9c9c43e62a'; // WorldPaversCo template

// 5 DRAFT, 4 SENT, 3 VIEWED, 3 SIGNED, 5 COMPLETED, 5 CANCELLED = 25
const PLAN = [
  ['DRAFT', 5],
  ['SENT', 4],
  ['VIEWED', 3],
  ['SIGNED', 3],
  ['COMPLETED', 5],
  ['CANCELLED', 5],
];

const DAY = 86400000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

function buildData(n) {
  const day = String(((n - 1) % 28) + 1).padStart(2, '0'); // valid 01..28
  return {
    customer_name: `Test Client ${n}`,
    customer_email: `client${n}@example.com`,
    customer_phone: `(555) 000-${String(n).padStart(4, '0')}`,
    customer_address: `${n} Test Street`,
    city: 'Houston',
    state: 'TX',
    zip: '77001',
    project_address: `${n} Project Ave`,
    project_city: 'Houston',
    project_state: 'TX',
    project_zip: '77002',
    start_date: `2026-06-${day}`,
    contract_amount: `${n}5000.00`,
    warranty_years: '2',
    salesman_full_name: 'Jane Smith',
    state_registration_number: `TX-1234${n}`,
  };
}

function stateFields(status, n) {
  const ts = daysAgo((n % 20) + 1);
  const f = {};
  if (['SENT', 'VIEWED', 'SIGNED', 'COMPLETED'].includes(status)) {
    f.providerDocumentId = randomUUID();
    f.providerStatus = 'document.sent';
    f.providerLastSyncedAt = ts;
    f.sentAt = ts;
  }
  if (['VIEWED', 'SIGNED', 'COMPLETED'].includes(status)) f.viewedAt = ts;
  if (['SIGNED', 'COMPLETED'].includes(status)) f.signedAt = ts;
  if (status === 'COMPLETED') {
    f.completedAt = ts;
    f.countedInBilling = true;
    f.billingPeriod = '2026-06';
  }
  if (status === 'CANCELLED') f.cancelledAt = ts;
  return f;
}

async function main() {
  const items = [];
  let idx = 0;
  for (const [status, count] of PLAN) {
    for (let i = 0; i < count; i++) {
      idx += 1;
      items.push({ n: idx, status });
    }
  }

  let created = 0;
  let skipped = 0;
  for (const { n, status } of items) {
    const documentNumber = `CONSTRUCTION_CONTRACT-JT-${String(n).padStart(3, '0')}`;
    const existing = await prisma.document.findUnique({ where: { documentNumber } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.document.create({
      data: {
        documentNumber,
        userId: JANE_ID,
        companyProfileId: COMPANY_ID,
        documentTypeId: DOC_TYPE_ID,
        formDefinitionId: FORM_DEF_ID,
        signatureTemplateId: SIG_TPL_ID,
        status,
        contractDate: daysAgo((n % 20) + 1),
        ...stateFields(status, n),
        data: { create: { dataJson: buildData(n) } },
      },
    });
    created += 1;
  }

  const all = await prisma.document.findMany({
    where: { userId: JANE_ID },
    select: { status: true },
  });
  const byStatus = {};
  for (const d of all) byStatus[d.status] = (byStatus[d.status] || 0) + 1;

  console.log(`Created: ${created} | Skipped (already existed): ${skipped}`);
  console.log(`Jane total documents: ${all.length}`);
  console.log('By status:', JSON.stringify(byStatus, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SEED_ERROR:', e.message);
  process.exit(1);
});
