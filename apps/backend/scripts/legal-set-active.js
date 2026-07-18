/**
 * LOCAL helper to toggle the DRAFT legal versions active/inactive so the owner can
 * SEE the acceptance popup and revert.
 *
 *   node scripts/legal-set-active.js on --allow-draft   # popup appears
 *   node scripts/legal-set-active.js off                 # popup gone
 *
 * ⚠️ Activating a DRAFT requires the explicit `--allow-draft` flag — mirrors the
 * `isDraft` guard in LegalService.activateVersion ("the lawyer is the gate").
 * This script writes the DB directly; it is a LOCAL/testing convenience, NOT the
 * production go-live path (that uses a lawyer-approved, non-draft version).
 */
require('dotenv/config'); // auto-load apps/backend/.env → DATABASE_URL (no env var to set)
const { PrismaClient } = require('@prisma/client');

const VERSION = 'v1-draft';
const mode = process.argv[2]; // 'on' | 'off'
const allowDraft = process.argv.includes('--allow-draft');

async function main() {
  if (mode !== 'on' && mode !== 'off') {
    console.error('Usage: node scripts/legal-set-active.js on|off [--allow-draft]');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const drafts = await prisma.legalDocumentVersion.findMany({
      where: { version: VERSION },
    });
    if (drafts.length === 0) {
      console.error('No v1-draft versions found — run seed-legal-draft.js first.');
      process.exit(1);
    }
    if (mode === 'on' && !allowDraft && drafts.some((d) => d.isDraft)) {
      console.error(
        'Refusing to activate a DRAFT without --allow-draft (unreviewed text). ' +
          'Add --allow-draft for LOCAL testing.',
      );
      process.exit(1);
    }
    await prisma.legalDocumentVersion.updateMany({
      where: { version: VERSION },
      data: { isActive: mode === 'on' },
    });
    console.log(`=== v1-draft legal versions set isActive=${mode === 'on'} ===`);
    console.log(mode === 'on' ? 'Popup will appear at next app load.' : 'Popup gone.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('LEGAL_SET_ACTIVE_ERROR:', e?.stack || e);
  process.exit(1);
});
