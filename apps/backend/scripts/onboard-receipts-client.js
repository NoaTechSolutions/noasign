/**
 * Idempotent onboarding for a RECEIPTS-ONLY client — tenant + user + plan +
 * default receipt template + eligibility, in ONE command. Replaces the old
 * 5-manual-step dance (create user UI → find id → build → set-tenant-plan →
 * seed-receipt-template).
 *
 *   COMPANY_NAME="Acme LLC" EMAIL=owner@acme.test PASSWORD='Secret123!' \
 *     node scripts/onboard-receipts-client.js
 *
 * Optional env:
 *   ACCOUNT_TYPE=BUSINESS|INDIVIDUAL   (default BUSINESS)
 *   STANDARD_SLUG=<receipt standard>   (default: the isDefault standard in the catalog)
 *   DRY_RUN=true                       (print the plan, write nothing)
 *
 * Prerequisites:
 *   - Standard catalog seeded:  node scripts/seed-template-catalog.js
 *   - Backend built (reads PLAN_DEFAULTS from dist/):  npm run build
 *
 * What it does: assigns RECEIPTS_ONLY (fields from PLAN_DEFAULTS — direct upsert,
 * valid for provisioning a fresh tenant), creates a USER-role login (never
 * MASTER/ADMIN), instantiates a per-tenant ReceiptTemplate FROM the chosen catalog
 * standard (this instance is what the PDF engine consumes today), and records a
 * CompanyTemplate eligibility row marked default for the RECEIPT category.
 *
 * Idempotent: keyed on the user email; re-running updates in place.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

let PLAN_DEFAULTS;
try {
  ({ PLAN_DEFAULTS } = require('../dist/billing/plan-defaults'));
} catch {
  console.error('Could not load PLAN_DEFAULTS from dist/ — run `npm run build` first.');
  process.exit(1);
}

const COMPANY_NAME = process.env.COMPANY_NAME;
const EMAIL = (process.env.EMAIL || '').toLowerCase().trim();
const PASSWORD = process.env.PASSWORD;
const ACCOUNT_TYPE = (process.env.ACCOUNT_TYPE || 'BUSINESS').toUpperCase();
const STANDARD_SLUG = process.env.STANDARD_SLUG || null;
const DRY_RUN = String(process.env.DRY_RUN || 'false') === 'true';

(async () => {
  try {
    if (!COMPANY_NAME || !EMAIL || !PASSWORD) {
      throw new Error('Required env: COMPANY_NAME, EMAIL, PASSWORD (optional: ACCOUNT_TYPE, STANDARD_SLUG, DRY_RUN).');
    }
    if (!['BUSINESS', 'INDIVIDUAL'].includes(ACCOUNT_TYPE)) {
      throw new Error(`ACCOUNT_TYPE must be BUSINESS or INDIVIDUAL (got ${ACCOUNT_TYPE}).`);
    }

    const rd = PLAN_DEFAULTS.RECEIPTS_ONLY;
    const companyData = {
      companyName: COMPANY_NAME,
      planName: 'RECEIPTS_ONLY',
      monthlyDocLimit: 0,
      isUnlimited: false,
      overagePrice: rd.contractOveragePrice, // contract overage (0 for receipts-only)
      monthlyReceiptLimit: rd.monthlyReceiptLimit,
      receiptsUnlimited: rd.receiptsUnlimited,
      receiptOveragePrice: rd.receiptOveragePrice,
      contractsEnabled: rd.contractsEnabled, // false
    };

    // Resolve the standard receipt design to provision from.
    const standard = STANDARD_SLUG
      ? await prisma.receiptTemplateStandard.findUnique({ where: { slug: STANDARD_SLUG } })
      : (await prisma.receiptTemplateStandard.findFirst({ where: { isActive: true, isDefault: true } })) ||
        (await prisma.receiptTemplateStandard.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }));
    if (!standard) {
      throw new Error(
        STANDARD_SLUG
          ? `Receipt standard '${STANDARD_SLUG}' not found in catalog.`
          : 'No receipt standard in catalog — run `node scripts/seed-template-catalog.js` first.',
      );
    }

    if (DRY_RUN) {
      console.log('DRY_RUN — no writes. Planned onboarding:');
      console.log('  company:', COMPANY_NAME, '| plan: RECEIPTS_ONLY', companyData);
      console.log('  user:', EMAIL, '| role: USER | accountType:', ACCOUNT_TYPE);
      console.log('  standard:', standard.slug, `(${standard.id})`, '->', standard.basePdfPath);
      await prisma.$disconnect();
      return;
    }

    // 1) Company (RECEIPTS_ONLY). Keyed via the user email for idempotency.
    let user = await prisma.user.findUnique({ where: { email: EMAIL } });
    const company =
      user && user.companyProfileId
        ? await prisma.companyProfile.update({ where: { id: user.companyProfileId }, data: companyData })
        : await prisma.companyProfile.create({ data: companyData });

    // 2) User (USER role — never MASTER/ADMIN; standalone tenant).
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const userData = {
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      accountType: ACCOUNT_TYPE,
      companyProfileId: company.id,
      parentCompanyProfileId: null,
    };
    user = user
      ? await prisma.user.update({ where: { id: user.id }, data: userData })
      : await prisma.user.create({ data: { email: EMAIL, ...userData } });

    // 3) Per-tenant ReceiptTemplate instance from the standard (consumed by the
    //    PDF engine). Idempotent by (company, standard).
    const tplData = {
      name: standard.name,
      basePdfPath: standard.basePdfPath,
      pageWidth: standard.pageWidth,
      pageHeight: standard.pageHeight,
      mediaBoxOffsetY: standard.mediaBoxOffsetY,
      fieldMappingJson: standard.fieldMappingJson,
      numberFormat: standard.numberFormat,
      standardId: standard.id,
      isActive: true,
      isDefault: true,
    };
    const existingTpl = await prisma.receiptTemplate.findFirst({
      where: { companyProfileId: company.id, standardId: standard.id },
    });
    const tpl = existingTpl
      ? await prisma.receiptTemplate.update({ where: { id: existingTpl.id }, data: tplData })
      : await prisma.receiptTemplate.create({ data: { companyProfileId: company.id, ...tplData } });

    // 4) Eligibility row (default for the RECEIPT category).
    const assignData = {
      receiptStandardId: standard.id,
      receiptTemplateId: tpl.id,
      isDefault: true,
      isActive: true,
    };
    const existingAssign = await prisma.companyTemplate.findFirst({
      where: { companyProfileId: company.id, category: 'RECEIPT', receiptTemplateId: tpl.id },
    });
    const assignment = existingAssign
      ? await prisma.companyTemplate.update({ where: { id: existingAssign.id }, data: assignData })
      : await prisma.companyTemplate.create({
          data: { companyProfileId: company.id, category: 'RECEIPT', ...assignData },
        });

    console.log('✅ Receipts client onboarded:');
    console.log('  company        :', company.companyName, `(${company.id})`);
    console.log('  plan           : RECEIPTS_ONLY (contractsEnabled=false, receiptsUnlimited=' + company.receiptsUnlimited + ')');
    console.log('  login          :', EMAIL, '/', PASSWORD, '(role USER,', ACCOUNT_TYPE + ')');
    console.log('  userId         :', user.id);
    console.log('  receiptTemplate:', tpl.name, `(${tpl.id})`, 'from standard', standard.slug);
    console.log('  eligibility    :', assignment.id, '(RECEIPT default)');

    await prisma.$disconnect();
  } catch (e) {
    console.error('ONBOARD_RECEIPTS_CLIENT_ERROR:', e.message);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
