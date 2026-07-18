require('dotenv/config'); // auto-load apps/backend/.env → DATABASE_URL (no env var to set)
const { PrismaClient } = require('@prisma/client');

/**
 * LOCAL helper: DELETE recorded acceptances so the popup appears AGAIN (to re-test
 * the flow — accept is a one-time act per version, so without this you can only test
 * it once).
 *
 *   node scripts/legal-reset-acceptance.js                 # reset EVERYONE
 *   node scripts/legal-reset-acceptance.js some@email.com  # reset one user
 *
 * ⚠️ LOCAL/testing only — deletes real acceptance rows. Never run against prod.
 * (LegalAcceptance is append-only in the app; this script is the deliberate,
 * out-of-band reset for validation.)
 */
async function main() {
  const email = process.argv[2] || null;
  const prisma = new PrismaClient();
  try {
    let where = {};
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.error(`No user with email ${email}.`);
        process.exit(1);
      }
      where = { userId: user.id };
    }
    const { count } = await prisma.legalAcceptance.deleteMany({ where });
    console.log(
      `=== deleted ${count} acceptance row(s)${email ? ` for ${email}` : ' (everyone)'} ===`,
    );
    console.log(
      count > 0
        ? 'Reload the app — if a version is active, the popup appears again.'
        : 'Nothing to delete (no acceptances recorded).',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('LEGAL_RESET_ERROR:', e?.stack || e);
  process.exit(1);
});
