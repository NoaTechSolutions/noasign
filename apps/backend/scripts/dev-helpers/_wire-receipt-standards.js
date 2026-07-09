/**
 * Idempotent per-tenant wiring FROM the standard catalog (unlike
 * _seed-receipt-template.js, which hardcodes the legacy WPC classic design).
 * Provisions a per-tenant ReceiptTemplate for EACH of the 3 standard receipt
 * designs (so all are renderable/selectable), and marks <defaultSlug> as the
 * tenant's default under BOTH resolver paths:
 *   - legacy resolver (newest active per-tenant template): bumps the default's
 *     createdAt so it is unambiguously newest.
 *   - V2 resolver (CompanyTemplate isDefault): upserts a CompanyTemplate default.
 *
 *   DATABASE_URL=... node scripts/dev-helpers/_wire-receipt-standards.js <companyProfileId> [defaultSlug]
 *
 * Requires the standard catalog to be seeded first (seed-template-catalog.js) and
 * the PAYMENT_RECEIPT DocumentType (migration 20260609130000). Additive/idempotent.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companyProfileId = process.argv[2] || process.env.RECEIPT_TEMPLATE_COMPANY_ID;
const defaultSlug = process.argv[3] || 'receipt-basic-v1';
const SLUGS = ['receipt-basic-v1', 'receipt-moderno-v1', 'receipt-basic-v2'];

(async () => {
  try {
    if (!companyProfileId) {
      throw new Error('Usage: node _wire-receipt-standards.js <companyProfileId> [defaultSlug]');
    }
    if (!SLUGS.includes(defaultSlug)) {
      throw new Error(`defaultSlug must be one of ${SLUGS.join(', ')} (got '${defaultSlug}')`);
    }
    const company = await prisma.companyProfile.findUnique({ where: { id: companyProfileId } });
    if (!company) throw new Error(`Company ${companyProfileId} not found`);

    const docType = await prisma.documentType.findUnique({ where: { code: 'PAYMENT_RECEIPT' } });
    if (!docType) throw new Error('PAYMENT_RECEIPT DocumentType missing — apply migration 20260609130000.');

    let defaultTemplateId = null;
    const wired = [];
    for (const slug of SLUGS) {
      const std = await prisma.receiptTemplateStandard.findUnique({ where: { slug } });
      if (!std) {
        console.warn(`  standard '${slug}' not found — run seed-template-catalog.js first; skipping`);
        continue;
      }
      const name = `Receipt — ${std.name}`;
      const isDefault = slug === defaultSlug;
      const data = {
        basePdfPath: std.basePdfPath,
        pageWidth: std.pageWidth,
        pageHeight: std.pageHeight,
        mediaBoxOffsetY: std.mediaBoxOffsetY,
        fieldMappingJson: std.fieldMappingJson,
        numberFormat: std.numberFormat,
        isActive: true,
        standardId: std.id,
        category: 'RECEIPT',
        documentTypeId: docType.id,
        isDefault,
      };
      const existing = await prisma.receiptTemplate.findFirst({ where: { companyProfileId, name } });
      const tpl = existing
        ? await prisma.receiptTemplate.update({ where: { id: existing.id }, data })
        : await prisma.receiptTemplate.create({ data: { companyProfileId, name, ...data } });
      if (isDefault) defaultTemplateId = tpl.id;

      // V2 resolver: one CompanyTemplate per (tenant, RECEIPT, template).
      const ct = await prisma.companyTemplate.findFirst({
        where: { companyProfileId, category: 'RECEIPT', receiptTemplateId: tpl.id },
      });
      if (ct) {
        await prisma.companyTemplate.update({ where: { id: ct.id }, data: { isDefault, isActive: true } });
      } else {
        await prisma.companyTemplate.create({
          data: { companyProfileId, category: 'RECEIPT', receiptTemplateId: tpl.id, isDefault, isActive: true },
        });
      }
      wired.push({ slug, id: tpl.id, name, isDefault });
    }

    if (defaultTemplateId) {
      // legacy resolver picks the newest active per-tenant template — make the
      // chosen default unambiguously newest.
      await prisma.receiptTemplate.update({
        where: { id: defaultTemplateId },
        data: { createdAt: new Date() },
      });
      // V2 resolver: ensure exactly one default CompanyTemplate for this tenant/category.
      await prisma.companyTemplate.updateMany({
        where: { companyProfileId, category: 'RECEIPT', NOT: { receiptTemplateId: defaultTemplateId } },
        data: { isDefault: false },
      });
    } else {
      console.warn('  no default wired — is the catalog seeded and defaultSlug valid?');
    }

    console.log(`Wired ${wired.length} receipt templates for ${company.companyName} (${companyProfileId}); default='${defaultSlug}'`);
    for (const w of wired) console.log(`  ${w.isDefault ? '*' : ' '} ${w.slug} -> ${w.id} (${w.name})`);
    await prisma.$disconnect();
  } catch (e) {
    console.error('WIRE_RECEIPT_STANDARDS_ERROR:', e.message);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
