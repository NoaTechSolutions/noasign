/* eslint-disable */
// LOCAL-ONLY test setup: create 3 loginable tenants on different plans so the
// billing/receipts UI can be reviewed by hand. Idempotent (fixed ids/emails).
//
// Seeds plan + contract fields + receipt fields directly (bypassing
// set-tenant-plan.js, whose anti-downgrade guard would block RECEIPTS_ONLY on a
// fresh contractsEnabled=true tenant — correct for prod, not for test seeding).
//
// Receipt fields come from PLAN_DEFAULTS (dist) to stay in sync with enforcement.
// Run from apps/backend:  node ./scripts/setup-billing-test-tenants.js
require('dotenv').config();
const path = require('path');
const { PrismaClient, UserRole, UserStatus, AccountType } = require('@prisma/client');
const bcrypt = require('bcrypt');

let PLAN_DEFAULTS;
try {
  ({ PLAN_DEFAULTS } = require(
    path.join(__dirname, '..', 'dist', 'billing', 'plan-defaults'),
  ));
} catch (e) {
  console.error('ERROR: build the backend first (dist/billing/plan-defaults missing).');
  process.exit(1);
}

const PASSWORD = 'secret123';

// Contract-side fields per plan (PLAN_DEFAULTS only covers receipts). Values
// mirror docs/product/pricing-canonical.md.
const TENANTS = [
  {
    id: 'b1110000-0000-4000-8000-000000000001',
    companyName: 'Test Starter Co',
    email: 'starter@billingtest.local',
    plan: 'STARTER',
    monthlyDocLimit: 5,
    isUnlimited: false,
    overagePrice: 4.0,
  },
  {
    id: 'b1110000-0000-4000-8000-000000000002',
    companyName: 'Test Pro Unlimited Co',
    email: 'prounlimited@billingtest.local',
    plan: 'PRO_UNLIMITED',
    monthlyDocLimit: 0,
    isUnlimited: true,
    overagePrice: 0,
  },
  {
    id: 'b1110000-0000-4000-8000-000000000003',
    companyName: 'Test Receipts Co',
    email: 'receipts@billingtest.local',
    plan: 'RECEIPTS_ONLY',
    monthlyDocLimit: 0,
    isUnlimited: false,
    overagePrice: 0,
    // accountType unset → renders as BUSINESS (shows the company name).
  },
  {
    // Same RECEIPTS_ONLY plan, but an INDIVIDUAL account → the dashboard shows
    // the PERSON name (Alex Rivera), so the WelcomeCard name card can be reviewed
    // both ways (business vs persona) within the receipts context.
    id: 'b1110000-0000-4000-8000-000000000004',
    companyName: 'Test Receipts Personal Co',
    email: 'receipts.personal@billingtest.local',
    plan: 'RECEIPTS_ONLY',
    monthlyDocLimit: 0,
    isUnlimited: false,
    overagePrice: 0,
    accountType: 'INDIVIDUAL',
    firstName: 'Alex',
    lastName: 'Rivera',
  },
  {
    // INDIVIDUAL on a normal CONTRACT plan (STARTER) — the 4th staging-parity
    // type (PERSONAL individual). Its companyProfile is nulled in the dashboard
    // (accountType INDIVIDUAL), so it exercises the plan-resolution path for the
    // Topbar plan label + Billing current-plan on a non-receipts individual.
    id: 'b1110000-0000-4000-8000-000000000005',
    companyName: 'Test Personal Individual Co',
    email: 'personal.individual@billingtest.local',
    plan: 'STARTER',
    monthlyDocLimit: 5,
    isUnlimited: false,
    overagePrice: 4.0,
    accountType: 'INDIVIDUAL',
    firstName: 'Pat',
    lastName: 'Individual',
  },
];

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
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
        update: { companyName: t.companyName, email: t.email, contactEmail: t.email, ...planFields },
        create: { id: t.id, companyName: t.companyName, email: t.email, contactEmail: t.email, ...planFields },
      });

      const accountFields = {
        accountType: t.accountType ? AccountType[t.accountType] : null,
        firstName: t.firstName ?? null,
        lastName: t.lastName ?? null,
      };

      await prisma.user.upsert({
        where: { email: t.email },
        update: {
          companyProfileId: t.id,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          ...accountFields,
        },
        create: {
          email: t.email,
          companyProfileId: t.id,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          ...accountFields,
        },
      });

      out.push({
        plan: t.plan,
        company: t.companyName,
        accountType: t.accountType ?? 'BUSINESS (default)',
        login: { email: t.email, password: PASSWORD, role: 'USER' },
        contractsEnabled: rd.contractsEnabled,
        monthlyDocLimit: t.monthlyDocLimit,
        isUnlimited: t.isUnlimited,
        receiptsUnlimited: rd.receiptsUnlimited,
        monthlyReceiptLimit: rd.monthlyReceiptLimit,
      });
    }
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
