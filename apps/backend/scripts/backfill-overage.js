/* eslint-disable */
// One-shot, CONSERVATIVE backfill of the contract overage debt.
//
// The CompanyProfile.overagePrice column used a $5.00 schema default that matches
// NO plan's canonical rate (Starter $4 / Launch $3.50 / Pro $2.50 / Scale $1.50 /
// unlimited→0). Tenants created without an explicit value inherited the wrong $5.
//
// This script ONLY rewrites tenants whose stored overagePrice === 5 (the leaked
// default → provably wrong, safe to fix) to their plan's canonical rate from
// PLAN_DEFAULTS. ANY OTHER value is treated as a deliberate per-tenant override
// (e.g. worldpaversco) and is LISTED but NEVER touched.
//
// DRY_RUN by default (preview only). Re-run with DRY_RUN=false to apply.
//
//   Run from apps/backend with DATABASE_URL set:
//     DRY_RUN=true  node scripts/backfill-overage.js   # preview (default)
//     DRY_RUN=false node scripts/backfill-overage.js   # apply
require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');

let PLAN_DEFAULTS;
try {
  ({ PLAN_DEFAULTS } = require(
    path.join(__dirname, '..', 'dist', 'billing', 'plan-defaults'),
  ));
} catch (e) {
  console.error('ERROR: build the backend first (dist/billing/plan-defaults missing).');
  process.exit(1);
}

const LEAKED_DEFAULT = 5;
const dryRun = process.env.DRY_RUN !== 'false'; // safe by default

async function main() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.companyProfile.findMany({
      select: { id: true, companyName: true, planName: true, overagePrice: true },
      orderBy: { companyName: 'asc' },
    });

    const toFix = [];
    const skipped = [];

    for (const t of tenants) {
      const current = Number(t.overagePrice);
      const canonical = PLAN_DEFAULTS[t.planName]?.contractOveragePrice;
      const row = {
        id: t.id,
        company: t.companyName,
        plan: t.planName,
        current,
        canonical: canonical ?? null,
      };
      if (current === LEAKED_DEFAULT) {
        // Leaked $5 default → safe to correct to the plan's canonical rate.
        toFix.push(row);
      } else {
        // Deliberate / already-correct / unknown value → DO NOT touch.
        skipped.push({
          ...row,
          reason:
            canonical != null && current === canonical
              ? 'already canonical'
              : 'deliberate override — needs owner review',
        });
      }
    }

    console.log('=== TENANTS TO FIX ($5 leaked default → plan canonical) ===');
    console.log(JSON.stringify(toFix, null, 2));
    console.log('=== SKIPPED (not $5 — left untouched) ===');
    console.log(JSON.stringify(skipped, null, 2));
    console.log(
      `\nSummary: ${toFix.length} to fix, ${skipped.length} skipped, ${tenants.length} total.`,
    );

    if (dryRun) {
      console.log('\nDRY_RUN=true → no write. Re-run with DRY_RUN=false to apply.');
      return;
    }

    let applied = 0;
    for (const r of toFix) {
      if (r.canonical == null) {
        console.warn(`SKIP ${r.company}: no canonical for plan ${r.plan}`);
        continue;
      }
      await prisma.companyProfile.update({
        where: { id: r.id },
        data: { overagePrice: r.canonical },
      });
      applied++;
    }
    console.log(`\nAPPLIED: updated ${applied} tenant(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
