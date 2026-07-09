/**
 * Set (or clear) the OWNER of a catalog template standard — its visibility.
 *
 *   node scripts/associate-template-owner.js <slug> <companyProfileId>
 *   node scripts/associate-template-owner.js <slug> global      # make it global
 *
 * ownerCompanyProfileId = null  → GLOBAL (every tenant sees it).
 * ownerCompanyProfileId = <id>  → PRIVATE to that tenant (only its users + any
 *                                 SUPERADMIN see it in GET /templates).
 *
 * Environment-aware: run it per deployment with that environment's tenant id
 * (the WPC id differs between local and prod). Validates both the standard and
 * the target CompanyProfile exist before writing. Idempotent.
 *
 *   LOCAL example (World Pavers local tenant):
 *     node scripts/associate-template-owner.js receipt-classic 7aaad16a-6d76-4c36-97c7-b9ce3e45b801
 *   STAGING/PROD example (real World Pavers):
 *     node scripts/associate-template-owner.js receipt-classic a6150399-8bd8-4b26-88fc-0f3d38acc1ea
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const [, , slug, ownerArg] = process.argv;

(async () => {
  try {
    if (!slug || !ownerArg) {
      console.error(
        'Usage: node scripts/associate-template-owner.js <slug> <companyProfileId|global>',
      );
      process.exit(1);
    }

    const standard = await prisma.receiptTemplateStandard.findUnique({
      where: { slug },
    });
    if (!standard) {
      console.error(`Standard not found for slug "${slug}".`);
      process.exit(1);
    }

    const clearing = ownerArg === 'global' || ownerArg === 'null';
    let ownerCompanyProfileId = null;

    if (!clearing) {
      const cp = await prisma.companyProfile.findUnique({
        where: { id: ownerArg },
        select: { id: true, companyName: true },
      });
      if (!cp) {
        console.error(
          `CompanyProfile "${ownerArg}" does not exist in THIS database — refusing to set a dangling owner. ` +
            'Run with the tenant id that exists in this environment (or "global" to clear).',
        );
        process.exit(1);
      }
      ownerCompanyProfileId = cp.id;
      console.log(`Target tenant: ${cp.companyName} (${cp.id})`);
    }

    const updated = await prisma.receiptTemplateStandard.update({
      where: { slug },
      data: { ownerCompanyProfileId },
      select: { slug: true, name: true, ownerCompanyProfileId: true },
    });
    console.log(
      `OK — "${updated.slug}" (${updated.name}) is now ${
        updated.ownerCompanyProfileId
          ? `PRIVATE to ${updated.ownerCompanyProfileId}`
          : 'GLOBAL'
      }.`,
    );

    await prisma.$disconnect();
  } catch (e) {
    console.error('ASSOCIATE_OWNER_ERROR:', e && e.message ? e.message : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
