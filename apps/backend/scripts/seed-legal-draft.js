/**
 * Seed the DRAFT legal versions (Terms + Privacy) from the markdown source in
 * `legal/`. Idempotent (upsert by docType+version). ⚠️ Inserts them INACTIVE
 * (`isActive: false`) and `isDraft: true` — so a normal seed/deploy blocks NOBODY.
 * To make the popup appear in LOCAL, explicitly activate with:
 *     node scripts/legal-set-active.js on --allow-draft
 * and revert with:
 *     node scripts/legal-set-active.js off
 *
 * The real go-live uses a lawyer-approved (isDraft:false) version, activated
 * without the override — see docs/architecture/legal-acceptance.md.
 */
require('dotenv/config'); // auto-load apps/backend/.env → DATABASE_URL (no env var to set)
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const DOCS = [
  { docType: 'TERMS', file: 'legal/terms/v1-draft.md' },
  { docType: 'PRIVACY', file: 'legal/privacy/v1-draft.md' },
];
const VERSION = 'v1-draft';

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const d of DOCS) {
      const content = fs.readFileSync(path.resolve(d.file), 'utf8');
      const contentHash = createHash('sha256').update(content).digest('hex');
      const existing = await prisma.legalDocumentVersion.findUnique({
        where: { docType_version: { docType: d.docType, version: VERSION } },
      });
      if (existing) {
        // Never flip isActive here — activation is a separate, explicit step.
        await prisma.legalDocumentVersion.update({
          where: { id: existing.id },
          data: { content, contentHash, isDraft: true },
        });
        console.log(`  updated DRAFT ${d.docType}/${VERSION} (isActive left as-is)`);
      } else {
        await prisma.legalDocumentVersion.create({
          data: {
            docType: d.docType,
            version: VERSION,
            content,
            contentHash,
            isActive: false, // ⚠️ inactive — blocks nobody until explicitly activated
            isDraft: true,
          },
        });
        console.log(`  created DRAFT ${d.docType}/${VERSION} (INACTIVE)`);
      }
    }
    console.log('=== legal draft seed done (all INACTIVE — no popup until activated) ===');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('SEED_LEGAL_DRAFT_ERROR:', e?.stack || e);
  process.exit(1);
});
