/**
 * Idempotent, non-destructive staging seed: the three test tenants missing from
 * the original staging seed, so all FOUR account/plan combinations exist as
 * clearly-named, loginable fixtures for the "Receipts -> plan with documents"
 * migration work:
 *
 *   1. PERSONAL (individual) on a normal contract plan  -> personal.individual@
 *   2. BUSINESS on a normal contract plan               -> World Pavers (existing)
 *   3. RECEIPTS personal (individual)                   -> receipts.personal@
 *   4. RECEIPTS business                                -> receipts.business@
 *
 * Type 2 already exists (World Pavers, seeded by _seed-staging-test-users.js) and
 * is intentionally NOT touched here. The existing personal@/business@ logins are
 * also left untouched — these three tenants are brand-new test data, each on its
 * OWN company so plan + accountType are unambiguous (1 user = 1 company = 1 plan).
 *
 * Mirrors scripts/setup-billing-test-tenants.js (the LOCAL reference structure):
 * writes plan + contract + receipt fields DIRECTLY, bypassing set-tenant-plan.js
 * (whose anti-downgrade guard would block RECEIPTS_ONLY on a fresh
 * contractsEnabled=true tenant — correct for prod, wrong for test seeding).
 *
 * Receipt fields come from PLAN_DEFAULTS (dist) to stay in sync with enforcement,
 * so the backend must be built first (the deploy step runs `npm run build` before
 * the gated seed). DATABASE_URL is exported by the workflow.
 *
 * The two RECEIPTS_ONLY tenants still need a per-tenant ReceiptTemplate to issue
 * receipts — the workflow runs _seed-receipt-template.js for each company id below.
 *
 * Idempotent: upserts by fixed company id / email; passwords set on create AND
 * update so the reported credentials always work. Override via env STAGING_*.
 */
const path = require('path');
const {
  PrismaClient,
  UserRole,
  UserStatus,
  AccountType,
} = require('@prisma/client');
const bcrypt = require('bcrypt');

let PLAN_DEFAULTS;
try {
  ({ PLAN_DEFAULTS } = require(
    path.join(__dirname, '..', '..', 'dist', 'billing', 'plan-defaults'),
  ));
} catch (e) {
  console.error(
    'ERROR: build the backend first (dist/billing/plan-defaults missing).',
  );
  process.exit(1);
}

// Fixed, staging-namespaced company ids (distinct from World Pavers 7aaad16a- and
// the local billing-test b111-). Referenced by the workflow's receipt-template step.
const TENANTS = [
  {
    id: '5ad11000-0000-4000-8000-000000000001',
    companyName: 'Staging Personal Individual',
    email: 'personal.individual@staging.ntssign.com',
    password: process.env.STAGING_PERSONAL_IND_PASSWORD || 'PersonalIndStg2026!',
    plan: 'STARTER',
    accountType: 'INDIVIDUAL',
    firstName: 'Pat',
    lastName: 'Individual',
    // Contract-side fields (PLAN_DEFAULTS only covers receipts). STARTER mirrors
    // scripts/setup-billing-test-tenants.js / docs/product/pricing-canonical.md.
    monthlyDocLimit: 5,
    isUnlimited: false,
    overagePrice: 4.0,
  },
  {
    id: '5ad11000-0000-4000-8000-000000000002',
    companyName: 'Staging Receipts Personal',
    email: 'receipts.personal@staging.ntssign.com',
    password: process.env.STAGING_RECEIPTS_PERSONAL_PASSWORD || 'ReceiptPersStg2026!',
    plan: 'RECEIPTS_ONLY',
    accountType: 'INDIVIDUAL',
    firstName: 'Robin',
    lastName: 'Receipts',
    monthlyDocLimit: 0,
    isUnlimited: false,
    overagePrice: 0,
  },
  {
    id: '5ad11000-0000-4000-8000-000000000003',
    companyName: 'Staging Receipts Business',
    email: 'receipts.business@staging.ntssign.com',
    password: process.env.STAGING_RECEIPTS_BUSINESS_PASSWORD || 'ReceiptBizStg2026!',
    plan: 'RECEIPTS_ONLY',
    accountType: 'BUSINESS', // explicit (not NULL) so the type is unambiguous
    firstName: null,
    lastName: null,
    monthlyDocLimit: 0,
    isUnlimited: false,
    overagePrice: 0,
  },
];

async function main() {
  const prisma = new PrismaClient();
  const out = [];
  try {
    for (const t of TENANTS) {
      const rd = PLAN_DEFAULTS[t.plan];
      if (!rd) throw new Error(`PLAN_DEFAULTS missing ${t.plan}`);

      const planFields = {
        planName: t.plan,
        monthlyDocLimit: t.monthlyDocLimit,
        isUnlimited: t.isUnlimited,
        overagePrice: t.overagePrice,
        monthlyReceiptLimit: rd.monthlyReceiptLimit,
        receiptsUnlimited: rd.receiptsUnlimited,
        receiptOveragePrice: rd.receiptOveragePrice,
        contractsEnabled: rd.contractsEnabled,
      };

      await prisma.companyProfile.upsert({
        where: { id: t.id },
        update: {
          companyName: t.companyName,
          email: t.email,
          contactEmail: t.email,
          ...planFields,
        },
        create: {
          id: t.id,
          companyName: t.companyName,
          email: t.email,
          contactEmail: t.email,
          ...planFields,
        },
      });

      const accountFields = {
        accountType: t.accountType ? AccountType[t.accountType] : null,
        firstName: t.firstName ?? null,
        lastName: t.lastName ?? null,
      };

      const passwordHash = await bcrypt.hash(t.password, 10);
      const user = await prisma.user.upsert({
        where: { email: t.email },
        update: {
          companyProfileId: t.id,
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          ...accountFields,
        },
        create: {
          email: t.email,
          companyProfileId: t.id,
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          ...accountFields,
        },
      });

      out.push({
        company: t.companyName,
        companyId: t.id,
        plan: t.plan,
        accountType: t.accountType,
        contractsEnabled: rd.contractsEnabled,
        login: { email: t.email, password: t.password, role: 'ADMIN' },
        userId: user.id,
      });
    }

    console.log('=== STAGING 4-TYPE SEED DONE ===');
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('STAGING_4TYPE_SEED_ERROR:', e.message);
  process.exit(1);
});
