/**
 * Replaces jane.smith's JT-* test docs with 6 fully-filled documents — one per
 * status — for visual testing of the DocumentDetailModal (all tabs populated,
 * Finance 1-4 cards with data).
 *
 * Idempotent: each doc has a stable number (CONSTRUCTION_CONTRACT-FULL-00N), the
 * "-FULL-00N" suffix is non-numeric so generateDocumentNumber ignores it. Deletes
 * the old JT-* docs on every run. Cleanup: delete where documentNumber startsWith
 * 'CONSTRUCTION_CONTRACT-FULL-'.
 *
 * Run: node scripts/dev-helpers/_seed-jane-full-docs.js
 */
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const JANE_ID = '9f339c28-3cd0-479a-afda-d97af327aa40';
const COMPANY_ID = '7aaad16a-6d76-4c36-97c7-b9ce3e45b801';
const DOC_TYPE_ID = 'a6e36562-c0d5-4857-a4f8-f92ddc245597'; // CONSTRUCTION_CONTRACT
const FORM_DEF_ID = 'fa4b20cb-ca48-4225-b5c8-f12ab51d5121';
const SIG_TPL_ID = '24ecb135-10a4-4579-9204-fe9c9c43e62a';

const fullFormData = {
  // CLIENT
  customer_name: 'Robert Johnson',
  customer_age: '35',
  customer_email: 'robert.johnson@example.com',
  customer_phone: '(305) 555-1234',
  customer_fax: '(305) 555-5678',
  customer_address: '456 Oak Avenue',
  city: 'Houston',
  state: 'TX',
  zip: '77001',
  // PROJECT
  project_address: '789 Construction Blvd',
  project_city: 'Houston',
  project_state: 'TX',
  project_zip: '77002',
  start_date: '2026-06-01',
  estimated_completion_date: '2026-09-30',
  project_description:
    'Full home renovation including kitchen remodel, bathroom upgrades, and exterior painting.',
  contract_scope: 'Interior and exterior renovation',
  // PRICING
  contract_amount: '45000.00',
  down_payment_amount: '9000.00',
  finance_charge: '1500.00',
  payment_schedule: 'Monthly installments',
  finance_1_amount: '9000.00',
  finance_1_description: 'First month payment',
  finance_1_date: '2026-07-01',
  finance_2_amount: '9000.00',
  finance_2_description: 'Second month payment',
  finance_2_date: '2026-08-01',
  finance_3_amount: '9000.00',
  finance_3_description: 'Third month payment',
  finance_3_date: '2026-09-01',
  finance_4_amount: '9000.00',
  finance_4_description: 'Final payment',
  finance_4_date: '2026-09-30',
  // OTHERS
  salesman_full_name: 'Jane Smith',
  state_registration_number: 'TX-98765',
  warranty_years: '3',
};

const DAY = 86400000;
const ago = (n) => new Date(Date.now() - n * DAY);

// Coherent timestamp chain: sent → viewed → signed → completed.
const sentAt = ago(5);
const viewedAt = ago(4);
const signedAt = ago(3);
const completedAt = ago(2);
const cancelledAt = ago(1);
const provider = () => ({ providerDocumentId: randomUUID(), providerStatus: 'document.sent', providerLastSyncedAt: ago(2) });

const DOCS = [
  { n: '001', status: 'DRAFT', extra: {} },
  { n: '002', status: 'SENT', extra: { ...provider(), sentAt } },
  { n: '003', status: 'VIEWED', extra: { ...provider(), sentAt, viewedAt } },
  { n: '004', status: 'SIGNED', extra: { ...provider(), sentAt, viewedAt, signedAt } },
  {
    n: '005',
    status: 'COMPLETED',
    extra: { ...provider(), sentAt, viewedAt, signedAt, completedAt, countedInBilling: true, billingPeriod: '2026-06' },
  },
  { n: '006', status: 'CANCELLED', extra: { cancelledAt } },
];

async function main() {
  const deleted = await prisma.document.deleteMany({
    where: { documentNumber: { startsWith: 'CONSTRUCTION_CONTRACT-JT-' } },
  });
  console.log(`Deleted ${deleted.count} JT-* docs`);

  let created = 0;
  let skipped = 0;
  for (const d of DOCS) {
    const documentNumber = `CONSTRUCTION_CONTRACT-FULL-${d.n}`;
    if (await prisma.document.findUnique({ where: { documentNumber } })) {
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
        status: d.status,
        contractDate: new Date('2026-06-01'),
        ...d.extra,
        data: { create: { dataJson: fullFormData } },
      },
    });
    created += 1;
  }

  const all = await prisma.document.findMany({
    where: { userId: JANE_ID },
    select: { status: true },
  });
  const byStatus = {};
  for (const x of all) byStatus[x.status] = (byStatus[x.status] || 0) + 1;
  console.log(`Created: ${created} | Skipped: ${skipped}`);
  console.log(`Jane total documents: ${all.length}`);
  console.log('By status:', JSON.stringify(byStatus, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SEED_ERROR:', e.message);
  process.exit(1);
});
