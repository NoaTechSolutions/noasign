/* eslint-disable */
// Model C — assign a plan to a tenant and seed its RECEIPT-billing fields from
// PLAN_DEFAULTS (single source of truth, compiled to dist/billing/plan-defaults).
//
// Sets: planName + monthlyReceiptLimit + receiptsUnlimited + receiptOveragePrice
//       + contractsEnabled.
// Does NOT touch the contract fields (monthlyDocLimit / isUnlimited / overagePrice)
// — those stay per-tenant overrides (e.g. worldpaversco's manual PRO_UNLIMITED).
//
// Env:
//   COMPANY_ID  (required)  CompanyProfile.id
//   PLAN        (required)  a PlanName (STARTER/LAUNCH/PRO/SCALE/PRO_UNLIMITED/
//                           PAY_PER_CONTRACT/RECEIPTS_ONLY)
//   DRY_RUN     ('true' default) — read-only preview unless explicitly 'false'
//   MONTHLY_RECEIPT_LIMIT (optional) — override the plan's receipt limit (e.g. 2
//                          for fast overage testing). A per-tenant override; the
//                          rest of the receipt fields still come from PLAN_DEFAULTS.
//
// Run from apps/backend with DATABASE_URL set (the prod-maintenance step does
// this). Idempotent.
const path = require('path');
const { PrismaClient } = require('@prisma/client');

let PLAN_DEFAULTS;
try {
  ({ PLAN_DEFAULTS } = require(
    path.join(__dirname, '..', 'dist', 'billing', 'plan-defaults'),
  ));
} catch (e) {
  console.error(
    'ERROR: could not load dist/billing/plan-defaults — build the backend first (npm run build).',
  );
  process.exit(1);
}

const companyId = process.env.COMPANY_ID;
const plan = process.env.PLAN;
const dryRun = process.env.DRY_RUN !== 'false'; // safe by default

async function main() {
  if (!companyId) throw new Error('COMPANY_ID is required');
  if (!plan) throw new Error('PLAN is required');
  const defaults = PLAN_DEFAULTS[plan];
  if (!defaults) {
    throw new Error(
      `Unknown PLAN "${plan}". Valid: ${Object.keys(PLAN_DEFAULTS).join(', ')}`,
    );
  }

  const prisma = new PrismaClient();
  try {
    const before = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        companyName: true,
        planName: true,
        monthlyDocLimit: true,
        isUnlimited: true,
        monthlyReceiptLimit: true,
        receiptsUnlimited: true,
        receiptOveragePrice: true,
        contractsEnabled: true,
      },
    });
    if (!before) throw new Error(`CompanyProfile ${companyId} not found`);

    // Anti-downgrade guard (Model C, backend half of the double-lock): a tenant
    // that already has a contracts plan (contractsEnabled=true) must NOT be moved
    // to RECEIPTS_ONLY — receipts-only contradicts contract capability and would
    // strip their contracts. The front hides RECEIPTS_ONLY in the same case; this
    // is the authoritative server-side check. Migrate/cancel contracts first.
    if (plan === 'RECEIPTS_ONLY' && before.contractsEnabled === true) {
      throw new Error(
        `Anti-downgrade: tenant "${before.companyName}" (${companyId}) is on ` +
          `"${before.planName}" with contractsEnabled=true. RECEIPTS_ONLY cannot ` +
          `be assigned to a tenant that has a contracts plan. Cancel/migrate its ` +
          `contracts first, or pick a contracts plan.`,
      );
    }

    // Optional per-tenant override of the receipt limit (e.g. 2 for fast overage
    // testing on staging). Falls back to the plan default when unset/invalid.
    const limitOverride = Number(process.env.MONTHLY_RECEIPT_LIMIT);
    const monthlyReceiptLimit = Number.isFinite(limitOverride)
      ? limitOverride
      : defaults.monthlyReceiptLimit;

    const next = {
      planName: plan,
      monthlyReceiptLimit,
      receiptsUnlimited: defaults.receiptsUnlimited,
      receiptOveragePrice: defaults.receiptOveragePrice,
      contractsEnabled: defaults.contractsEnabled,
    };

    console.log('=== BEFORE ===');
    console.log(JSON.stringify(before, null, 2));
    console.log('=== WILL SET (plan + receipt fields only) ===');
    console.log(JSON.stringify(next, null, 2));

    if (dryRun) {
      console.log('\nDRY_RUN=true → no write. Re-run with DRY_RUN=false to apply.');
      return;
    }

    const after = await prisma.companyProfile.update({
      where: { id: companyId },
      data: next,
      select: {
        planName: true,
        monthlyReceiptLimit: true,
        receiptsUnlimited: true,
        receiptOveragePrice: true,
        contractsEnabled: true,
        monthlyDocLimit: true,
        isUnlimited: true,
      },
    });
    console.log('=== AFTER (applied) ===');
    console.log(JSON.stringify(after, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
