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
// Scaled receipt counts per client so the "Top clients by receipts" card has a
// real ranking (6 clients → the card shows the top 5, the last one is cut off).
const TOP_CLIENT_PLAN = [
  { name: 'Northwind Traders', count: 6 },
  { name: 'Contoso Ltd', count: 5 },
  { name: 'Fabrikam Inc', count: 4 },
  { name: 'Adventure Works', count: 3 },
  { name: 'Tailspin Toys', count: 2 },
  { name: 'Wingtip Pavers', count: 1 },
];

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
    select: { id: true, companyProfileId: true },
  });
  if (!recUser?.companyProfileId) throw new Error(`Receipt user/tenant not found: ${RECEIPT_USER}`);
  const receipts = await prisma.document.findMany({
    where: {
      companyProfileId: recUser.companyProfileId,
      documentType: { code: RECEIPT_CODE },
      status: 'SENT',
      supersededAt: null,
      // Only real receipts — never the DEMO-TOPCLIENT ranking clones (which sort
      // first alphabetically and get wiped/rebuilt in step 3).
      documentNumber: { startsWith: 'PAYMENT_RECEIPT' },
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

  // 3. Top clients — seed customers with a scaled receipt count so the "Top clients
  //    by receipts" card shows a real ranking. Clones an existing receipt (copies
  //    all required scalar columns) and assigns each to a customer. Not counted
  //    toward this-month billing (countedAsReceipt: false), so it doesn't skew the
  //    volume/amount figures. Idempotent: DEMO-TOPCLIENT rows are wiped + rebuilt.
  const template = await prisma.document.findFirst({
    where: { companyProfileId: recUser.companyProfileId, documentType: { code: RECEIPT_CODE } },
  });
  if (template) {
    await prisma.document.deleteMany({
      where: {
        companyProfileId: recUser.companyProfileId,
        documentNumber: { startsWith: 'DEMO-TOPCLIENT-' },
      },
    });
    let made = 0;
    for (let i = 0; i < TOP_CLIENT_PLAN.length; i++) {
      const spec = TOP_CLIENT_PLAN[i];
      let customer = await prisma.customer.findFirst({
        where: { companyProfileId: recUser.companyProfileId, fullName: spec.name },
        select: { id: true },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            companyProfileId: recUser.companyProfileId,
            userId: recUser.id,
            fullName: spec.name,
          },
          select: { id: true },
        });
      }
      for (let n = 0; n < spec.count; n++) {
        const clone = { ...template };
        delete clone.id;
        delete clone.createdAt;
        delete clone.updatedAt;
        await prisma.document.create({
          data: {
            ...clone,
            documentNumber: `DEMO-TOPCLIENT-${i + 1}-${n + 1}`,
            customerId: customer.id,
            status: 'SENT',
            countedAsReceipt: false,
            // Back-dated so these ranking-only rows never surface in "Recent"
            // (which shows the newest receipts) — they exist only to populate the
            // all-time Top clients count.
            createdAt: new Date('2024-06-01T00:00:00Z'),
          },
        });
        made++;
      }
    }
    console.log(`[top-clients] ${TOP_CLIENT_PLAN.length} customers, ${made} receipts`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
