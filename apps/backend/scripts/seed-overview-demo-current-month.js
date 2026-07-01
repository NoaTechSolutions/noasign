/**
 * Overview demo seed — idempotent, reproducible.
 *
 * The base seed dates everything in April, so in any later month the redesigned
 * Overview shows 0 usage this month (savings "Start creating", "$0" amount). This
 * script bumps a few existing rows into the CURRENT billing period so the
 * document savings card and the receipt "$ amount this month" render with real
 * numbers for manual validation.
 *
 * Idempotent: re-running bumps the SAME first-N rows to the current period again.
 * Reproducible: the period is derived from the current date, so each run seeds
 * "this month" whenever it is run.
 *
 * NOTE on the document count: savings = documentsUsed × $12 (pay-per-doc) − the
 * plan's monthly price. carlos is on LAUNCH ($39/mo), so a single document is a
 * net LOSS (12 − 39 < 0) and would show the sober "Value this month" fallback,
 * not "You saved $X". Savings only turns positive at 4 documents (4×12 = 48 > 39),
 * so we bump 4 to demonstrate the positive card (+$9). Tune DOC_BUMP_COUNT below.
 *
 * Usage: node scripts/seed-overview-demo-current-month.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RECEIPT_CODE = 'PAYMENT_RECEIPT';
const DOC_USER = 'carlos.mendez@local.worldpaversco.com';
const RECEIPT_USER = 'receipts@billingtest.local';
// 4 = the minimum that makes savings positive on LAUNCH ($39/mo): 4×$12 = $48 > $39.
const DOC_BUMP_COUNT = 4;
const RECEIPT_BUMP_COUNT = 2;

function currentBillingPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function main() {
  const period = currentBillingPeriod();

  // 1. Documents — bump N of the doc user's contracts into the current period so
  //    documentsUsed (which drives the savings card) is non-zero.
  const docUser = await prisma.user.findFirst({
    where: { email: DOC_USER },
    select: { id: true },
  });
  if (!docUser) throw new Error(`Doc user not found: ${DOC_USER}`);
  const docs = await prisma.document.findMany({
    where: { userId: docUser.id, documentType: { code: { not: RECEIPT_CODE } } },
    orderBy: { documentNumber: 'asc' },
    take: DOC_BUMP_COUNT,
    select: { id: true, documentNumber: true },
  });
  for (const d of docs) {
    await prisma.document.update({
      where: { id: d.id },
      data: { countedInBilling: true, billingPeriod: period },
    });
  }
  console.log(
    `[docs] ${docs.length} → ${period}: ${docs.map((d) => d.documentNumber).join(', ')}`,
  );

  // 2. Receipts — bump N SENT receipts into the current period so
  //    receiptsThisMonth + amountThisMonth (the green card) are non-zero.
  const recUser = await prisma.user.findFirst({
    where: { email: RECEIPT_USER },
    select: { companyProfileId: true },
  });
  if (!recUser?.companyProfileId) throw new Error(`Receipt user/tenant not found: ${RECEIPT_USER}`);
  const receipts = await prisma.document.findMany({
    where: {
      companyProfileId: recUser.companyProfileId,
      documentType: { code: RECEIPT_CODE },
      status: 'SENT',
      supersededAt: null,
    },
    orderBy: { documentNumber: 'asc' },
    take: RECEIPT_BUMP_COUNT,
    select: { id: true, documentNumber: true },
  });
  for (const r of receipts) {
    await prisma.document.update({
      where: { id: r.id },
      data: { countedAsReceipt: true, billingPeriod: period },
    });
  }
  console.log(
    `[receipts] ${receipts.length} → ${period}: ${receipts.map((r) => r.documentNumber).join(', ')}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
