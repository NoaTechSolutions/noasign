/**
 * Safety dump of the tables the receipt-catalog gated dispatch touches, BEFORE it
 * seeds. Non-destructive read only. Prints the rows as JSON to stdout (captured in
 * the workflow run logs = downloadable backup) and writes a timestamped file.
 *
 *   DATABASE_URL=... node scripts/dev-helpers/_dump-receipt-tables.js [companyProfileId]
 *
 * Dumps: all receipt_template_standards; receipt_templates + company_templates for
 * the given tenant (the only rows the wiring upserts/flips).
 */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const companyProfileId = process.argv[2] || process.env.RECEIPT_TEMPLATE_COMPANY_ID || null;

(async () => {
  const q = (sql, ...a) => prisma.$queryRawUnsafe(sql, ...a);
  const dump = {
    dumpedFor: companyProfileId,
    receipt_template_standards: await q('SELECT * FROM receipt_template_standards ORDER BY slug'),
    receipt_templates: companyProfileId
      ? await q('SELECT * FROM receipt_templates WHERE "companyProfileId"=$1 ORDER BY "createdAt"', companyProfileId)
      : [],
    company_templates: companyProfileId
      ? await q('SELECT * FROM company_templates WHERE "companyProfileId"=$1', companyProfileId)
      : [],
  };
  const json = JSON.stringify(dump, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 2);
  // Stamp is passed in (Date.* is fine in a plain script; only workflows forbid it).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `receipt-tables-dump-${stamp}.json`;
  fs.writeFileSync(file, json);
  console.log(`=== PRE-SEED DUMP (${file}) ===`);
  console.log(
    `standards=${dump.receipt_template_standards.length} ` +
      `receipt_templates=${dump.receipt_templates.length} ` +
      `company_templates=${dump.company_templates.length}`,
  );
  console.log('--- BEGIN DUMP JSON ---');
  console.log(json);
  console.log('--- END DUMP JSON ---');
  await prisma.$disconnect();
})().catch((e) => { console.error('DUMP_ERROR:', e.message); process.exit(1); });
