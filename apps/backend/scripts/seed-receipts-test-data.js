/* eslint-disable */
// LOCAL-ONLY: seed a populated set of receipts for the RECEIPTS_ONLY test tenant
// (receipts@billingtest.local) so the receipts dashboard can be reviewed by hand
// with REAL numbers (Overview metrics, $ this month, status breakdown, Recent
// receipts; Documents list populated).
//
// Inserts receipts DIRECTLY via Prisma (no email/R2 dependency) so each status is
// deterministic — including SEND_FAILED and the derived VOID, which can't be
// forced through the normal send flow locally. Idempotent: re-running deletes its
// own fixed-id receipts and recreates them (your real receipts are untouched).
//
//   Run from apps/backend:  node ./scripts/seed-receipts-test-data.js
require('dotenv').config();
const { PrismaClient, DocumentStatus } = require('@prisma/client');

const prisma = new PrismaClient();

// Both RECEIPTS_ONLY test tenants get the same populated set, so the dashboard
// can be reviewed as a business (shows company name) and as an individual (shows
// person name). idx keys the fixed document ids so the two sets never collide.
const TENANTS = [
  { id: 'b1110000-0000-4000-8000-000000000003', idx: 1 }, // Test Receipts Co (business)
  { id: 'b1110000-0000-4000-8000-000000000004', idx: 2 }, // Test Receipts Personal Co (individual)
];
const RECEIPT_TYPE_CODE = 'PAYMENT_RECEIPT';

// Validated WPC field mapping (same as the dev-helper seeds) — only needed so the
// in-app "View PDF" works during the visual review.
const FIELD_MAPPING = {
  receipt_number: { type: 'text', x: 387, baseline: 488.5, font: 'Montserrat-Regular', size: 16, color: '#000000', autoShiftRightLimit: 558 },
  date: { type: 'text', x: 428, lineTop: 331, font: 'Carlito', size: 11.5 },
  client: { type: 'text', x: 118, lineTop: 371, font: 'Carlito', size: 11.5 },
  amount: { type: 'currency', x: 118, lineTop: 396, font: 'Carlito', size: 11.5 },
  payment_n: { type: 'text', x: 357, lineTop: 385, gap: -9, font: 'Carlito', size: 11.5 },
  payment_for: { type: 'text', x: 146, lineTop: 442, gap: 3.5, font: 'Carlito', size: 11.5 },
  received_by: { type: 'text', x: 138, lineTop: 465, font: 'Carlito', size: 11.5 },
  other_label: { type: 'text', x: 472, lineTop: 423, font: 'Carlito', size: 10 },
  payment_method: {
    type: 'checkbox_group', lineTop: 407, gap: -11.5, mark: 'X', font: 'Carlito-Bold', size: 12,
    options: { CASH: 63, CREDIT_DEBIT_CARD: 126, CHEQUE: 256, BANK_TRANSFER: 333, OTHER: 448 },
  },
};

const HOUR = 60 * 60 * 1000;
const now = Date.now();
const billingPeriod = (() => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();
const fmtDate = (ms) => {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

// Fixed ids → idempotent (re-runs replace exactly these rows). Keyed by tenant
// idx so the two tenants' receipts never collide.
const ID = (idx, n) => `c2220000-0000-4000-800${idx}-00000000000${n}`;
const YEAR = new Date(now).getFullYear();

// The 6 receipts. createdAt staggered so "Recent receipts" ordering looks natural
// (newest = the void). amount only counts toward $ this month when counted=true.
const RECEIPTS = [
  {
    n: 1, status: DocumentStatus.SENT, counted: true, ageHours: 120,
    client: 'Maple Street HOA', email: 'billing@maplestreethoa.example',
    amount: 1500, method: 'BANK_TRANSFER', for: 'Driveway resurfacing — phase 1',
  },
  {
    n: 2, status: DocumentStatus.SENT, counted: true, ageHours: 96,
    client: 'Riverside Property Mgmt', email: 'ap@riverside-pm.example',
    amount: 2750, method: 'CHEQUE', for: 'Parking lot sealcoating',
  },
  {
    n: 3, status: DocumentStatus.SENT, counted: true, ageHours: 72,
    client: 'Downtown Lofts LLC', email: 'office@downtownlofts.example',
    amount: 900, method: 'CREDIT_DEBIT_CARD', for: 'Walkway repair deposit',
  },
  {
    n: 4, status: DocumentStatus.DRAFT, counted: false, ageHours: 48,
    client: 'Greenfield Estates', email: 'contact@greenfield.example',
    amount: 1200, method: 'CASH', for: 'Patio paver installation',
  },
  {
    n: 5, status: DocumentStatus.SEND_FAILED, counted: false, ageHours: 24,
    client: 'Sunset Plaza Retail', email: 'no-such-mailbox@invalid.local',
    amount: 640, method: 'BANK_TRANSFER', for: 'Curb repair — final',
    sendError: 'SMTP 550: recipient mailbox unavailable (test seed)',
  },
  {
    // VOID = status stays SENT, supersededAt set. It was issued + counted THIS
    // month, then voided → its $ still shows in "this month" (faithful to prod).
    n: 6, status: DocumentStatus.SENT, counted: true, ageHours: 12, voided: true,
    client: 'Hillcrest Builders', email: 'accounts@hillcrest.example',
    amount: 1800, method: 'CHEQUE', for: 'Retaining wall — voided/reissued',
  },
];

async function seedTenant({ id: tenantId, idx }, docType, form) {
  // 1. Tenant + admin user must exist (from setup-billing-test-tenants.js).
  const user = await prisma.user.findFirst({
    where: { companyProfileId: tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new Error(
      `No user for tenant ${tenantId}. Run: node ./scripts/setup-billing-test-tenants.js first.`,
    );
  }

  // 2. Ensure the tenant has a ReceiptTemplate (so "View PDF" works in review).
  let template = await prisma.receiptTemplate.findFirst({
    where: { companyProfileId: tenantId, isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!template) {
    template = await prisma.receiptTemplate.create({
      data: {
        companyProfileId: tenantId,
        name: 'Receipt Template',
        basePdfPath: 'assets/templates/wpc_receipt.pdf',
        pageWidth: 612,
        pageHeight: 792,
        mediaBoxOffsetY: 7.92,
        fieldMappingJson: FIELD_MAPPING,
        numberFormat: 'REC-{YYYY}-{NNNN}',
        isActive: true,
      },
      select: { id: true },
    });
    console.log(`ReceiptTemplate created for tenant ${tenantId} (${template.id}).`);
  }

  // 3. Idempotent reset: drop ALL of this (dedicated test) tenant's receipts so
  //    re-runs — even across id-scheme changes — never collide on the
  //    (userId, type, documentNumber) unique. DocumentData cascades.
  await prisma.document.deleteMany({
    where: { companyProfileId: tenantId, documentType: { code: RECEIPT_TYPE_CODE } },
  });

  // 4. Create the receipts.
  for (const r of RECEIPTS) {
    const createdAt = new Date(now - r.ageHours * HOUR);
    const receiptNumber = `REC-${YEAR}-${String(r.n).padStart(4, '0')}`;
    const documentNumber = `PAYMENT_RECEIPT-${String(r.n).padStart(6, '0')}`;
    const isSentLike = r.status === DocumentStatus.SENT || r.status === DocumentStatus.SEND_FAILED;

    const dataJson = {
      client: r.client,
      email: r.email,
      amount: r.amount,
      date: fmtDate(createdAt.getTime()),
      payment_method: r.method,
      other_label: '',
      payment_for: r.for,
      payment_current: 1,
      payment_total: 1,
      received_by: 'Front Desk',
      phone: '',
      receipt_number: receiptNumber,
    };

    await prisma.document.create({
      data: {
        id: ID(idx, r.n),
        documentNumber,
        userId: user.id,
        companyProfileId: tenantId,
        documentTypeId: docType.id,
        formDefinitionId: form.id,
        receiptTemplateId: template.id,
        status: r.status,
        contractDate: createdAt,
        createdAt,
        sentAt: r.status === DocumentStatus.SENT ? createdAt : null,
        lastSentRecipientEmail: isSentLike ? r.email : null,
        sendCount: isSentLike ? 1 : 0,
        lastAttemptAt: isSentLike ? createdAt : null,
        sendError: r.sendError ?? null,
        supersededAt: r.voided ? new Date(now - 1 * HOUR) : null,
        countedAsReceipt: !!r.counted,
        billingPeriod: r.counted ? billingPeriod : null,
        isReceiptOverage: false,
        countedInBilling: false,
        isOverage: false,
        data: { create: { dataJson } },
      },
    });
  }

  // 5. Keep the per-tenant correlative consistent so the next REAL receipt
  //    continues after our seeds (REC-YYYY-0007).
  await prisma.receiptCounter.upsert({
    where: { companyProfileId_year: { companyProfileId: tenantId, year: YEAR } },
    create: { companyProfileId: tenantId, year: YEAR, lastNumber: RECEIPTS.length },
    update: { lastNumber: RECEIPTS.length },
  });

  return { email: user.email };
}

async function main() {
  // Shared: PAYMENT_RECEIPT type + active form (from migration 20260609130000).
  const docType = await prisma.documentType.findUnique({
    where: { code: RECEIPT_TYPE_CODE },
    select: { id: true },
  });
  if (!docType) throw new Error('PAYMENT_RECEIPT DocumentType missing — apply migration 20260609130000.');
  const form = await prisma.formDefinition.findFirst({
    where: { documentTypeId: docType.id, isActive: true },
    select: { id: true },
  });
  if (!form) throw new Error('No active PAYMENT_RECEIPT FormDefinition — apply migration 20260609130000.');

  const counted = RECEIPTS.filter((r) => r.counted);
  const amountThisMonth = counted.reduce((s, r) => s + r.amount, 0);
  const byStatus = {
    sent: RECEIPTS.filter((r) => r.status === DocumentStatus.SENT && !r.voided).length,
    draft: RECEIPTS.filter((r) => r.status === DocumentStatus.DRAFT).length,
    sendFailed: RECEIPTS.filter((r) => r.status === DocumentStatus.SEND_FAILED).length,
    void: RECEIPTS.filter((r) => r.voided).length,
  };

  const logins = [];
  for (const t of TENANTS) {
    const { email } = await seedTenant(t, docType, form);
    logins.push({ email, password: 'secret123' });
  }

  console.log(JSON.stringify({
    logins,
    billingPeriod,
    perTenant: {
      totalReceipts: RECEIPTS.length,
      byStatus,
      receiptsThisMonth: counted.length,
      amountThisMonth,
    },
  }, null, 2));
}

main()
  .catch((e) => {
    console.error('SEED_ERR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
