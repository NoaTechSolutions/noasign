/**
 * Seeds 2 DRAFT documents for jane.smith to test the Finance toggle in the
 * DocumentDetailModal's Contract card edit popup:
 *   - CONSTRUCTION_CONTRACT-FIN-001   → all finance fields filled (toggle ON)
 *   - CONSTRUCTION_CONTRACT-NOFIN-001 → all finance fields empty   (toggle OFF)
 *
 * Idempotent: keyed by documentNumber (non-numeric suffix → generateDocumentNumber
 * ignores it). Cleanup: delete where documentNumber startsWith
 * 'CONSTRUCTION_CONTRACT-FIN-' or '-NOFIN-'.
 *
 * Run: node scripts/dev-helpers/_seed-jane-finance-test.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const JANE_ID = '9f339c28-3cd0-479a-afda-d97af327aa40';
const COMPANY_ID = '7aaad16a-6d76-4c36-97c7-b9ce3e45b801';
const DOC_TYPE_ID = 'a6e36562-c0d5-4857-a4f8-f92ddc245597'; // CONSTRUCTION_CONTRACT
const FORM_DEF_ID = 'fa4b20cb-ca48-4225-b5c8-f12ab51d5121';
const SIG_TPL_ID = '24ecb135-10a4-4579-9204-fe9c9c43e62a';

const withFinance = {
  customer_name: 'Finance Client Test',
  customer_email: 'finance@example.com',
  customer_phone: '(555) 100-0001',
  customer_address: '100 Finance St',
  city: 'Houston', state: 'TX', zip: '77001',
  project_address: '200 Finance Ave',
  project_city: 'Houston', project_state: 'TX', project_zip: '77002',
  start_date: '2026-06-01',
  estimated_completion_date: '2026-09-30',
  contract_amount: '50000.00',
  down_payment_amount: '10000.00',
  payment_schedule: 'Monthly',
  finance_charge: '2000.00',
  finance_1_amount: '10000.00', finance_1_description: 'First payment', finance_1_date: '2026-07-01',
  finance_2_amount: '10000.00', finance_2_description: 'Second payment', finance_2_date: '2026-08-01',
  finance_3_amount: '10000.00', finance_3_description: 'Third payment', finance_3_date: '2026-09-01',
  finance_4_amount: '10000.00', finance_4_description: 'Final payment', finance_4_date: '2026-09-30',
  salesman_full_name: 'Jane Smith',
  state_registration_number: 'TX-11111',
  warranty_years: '2',
};

const withoutFinance = {
  customer_name: 'No Finance Client Test',
  customer_email: 'nofinance@example.com',
  customer_phone: '(555) 200-0002',
  customer_address: '200 NoFinance St',
  city: 'Houston', state: 'TX', zip: '77001',
  project_address: '300 NoFinance Ave',
  project_city: 'Houston', project_state: 'TX', project_zip: '77002',
  start_date: '2026-06-01',
  estimated_completion_date: '2026-09-30',
  contract_amount: '30000.00',
  down_payment_amount: '6000.00',
  payment_schedule: 'Lump sum',
  finance_charge: '',
  finance_1_amount: '', finance_1_description: '', finance_1_date: '',
  finance_2_amount: '', finance_2_description: '', finance_2_date: '',
  finance_3_amount: '', finance_3_description: '', finance_3_date: '',
  finance_4_amount: '', finance_4_description: '', finance_4_date: '',
  salesman_full_name: 'Jane Smith',
  state_registration_number: 'TX-22222',
  warranty_years: '1',
};

const DOCS = [
  { documentNumber: 'CONSTRUCTION_CONTRACT-FIN-001', dataJson: withFinance },
  { documentNumber: 'CONSTRUCTION_CONTRACT-NOFIN-001', dataJson: withoutFinance },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const d of DOCS) {
    if (await prisma.document.findUnique({ where: { documentNumber: d.documentNumber } })) {
      skipped += 1;
      continue;
    }
    await prisma.document.create({
      data: {
        documentNumber: d.documentNumber,
        userId: JANE_ID,
        companyProfileId: COMPANY_ID,
        documentTypeId: DOC_TYPE_ID,
        formDefinitionId: FORM_DEF_ID,
        signatureTemplateId: SIG_TPL_ID,
        status: 'DRAFT',
        contractDate: new Date('2026-06-01'),
        data: { create: { dataJson: d.dataJson } },
      },
    });
    created += 1;
  }
  console.log(`Created: ${created} | Skipped: ${skipped}`);
  const all = await prisma.document.findMany({
    where: { userId: JANE_ID },
    select: { documentNumber: true, status: true },
    orderBy: { documentNumber: 'asc' },
  });
  console.log(`Jane total: ${all.length}`);
  console.log(JSON.stringify(all, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SEED_ERROR:', e.message);
  process.exit(1);
});
