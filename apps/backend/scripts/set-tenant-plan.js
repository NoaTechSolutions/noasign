/* eslint-disable */
// Model C — assign a plan to a tenant and seed its RECEIPT-billing fields from
// PLAN_DEFAULTS (single source of truth, compiled to dist/billing/plan-defaults).
//
// Sets: planName + monthlyReceiptLimit + receiptsUnlimited + receiptOveragePrice
//       + contractOveragePrice (overagePrice) + contractsEnabled.
// overagePrice is now seeded from the plan's canonical contract overage (4/3.5/
// 2.5/1.5, unlimited→0) — assigning a plan leaves the correct overage, no more $5.
// Still does NOT touch monthlyDocLimit / isUnlimited — those stay per-tenant
// overrides (e.g. worldpaversco's manual PRO_UNLIMITED doc cap).
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

    // Anti-downgrade guard (Model C, backend half of the double-lock) — by REAL
    // USAGE, not capability: block RECEIPTS_ONLY only if the tenant has LIVE
    // contracts (BOLDSIGN documents) that a receipts-only plan would orphan.
    // DRAFT / CANCELLED / voided (supersededAt set) contracts are NOT live usage
    // — a tenant that created and then cancelled all its contracts can downgrade.
    // (Document has no soft-delete column; void is the supersededAt marker.)
    // A contracts-plan tenant with ZERO live contracts can move freely.
    if (plan === 'RECEIPTS_ONLY') {
      const contractCount = await prisma.document.count({
        where: {
          companyProfileId: companyId,
          documentType: { generationMode: 'BOLDSIGN' },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
          supersededAt: null,
        },
      });
      if (contractCount > 0) {
        throw new Error(
          `Anti-downgrade: tenant "${before.companyName}" (${companyId}) has ` +
            `${contractCount} live contract(s) (active BOLDSIGN documents). ` +
            `RECEIPTS_ONLY would orphan them — cancel/migrate those contracts ` +
            `first. (DRAFT/CANCELLED/voided contracts don't count; a tenant with ` +
            `zero live contracts CAN move to receipts-only.)`,
        );
      }
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
      // Contract overage from the canonical per-plan rate (single source of
      // truth). Fixes the $5 schema-default debt for every plan assignment.
      overagePrice: defaults.contractOveragePrice,
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
