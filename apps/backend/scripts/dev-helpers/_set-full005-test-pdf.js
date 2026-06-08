/**
 * Marks FULL-005 (the COMPLETED demo doc) so the /final-pdf endpoint serves a
 * public sample PDF instead of hitting BoldSign with its fake provider id.
 *
 * streamFinalPdf() bypasses BoldSign when providerDocumentId starts with
 * 'test-pdf' (see documents.service.ts). This sets that marker.
 *
 * Idempotent. Run: node scripts/dev-helpers/_set-full005-test-pdf.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DOC_NUMBER = 'CONSTRUCTION_CONTRACT-FULL-005';

async function main() {
  const doc = await prisma.document.findUnique({
    where: { documentNumber: DOC_NUMBER },
    select: { id: true, status: true, providerDocumentId: true },
  });

  if (!doc) {
    console.error(`NOT FOUND: ${DOC_NUMBER} — run _seed-jane-full-docs.js first.`);
    process.exit(1);
  }

  const updated = await prisma.document.update({
    where: { documentNumber: DOC_NUMBER },
    data: {
      providerDocumentId: 'test-pdf-FULL-005',
      // Make sure it stays COMPLETED so the PDF tab shows up.
      status: 'COMPLETED',
    },
    select: { id: true, status: true, providerDocumentId: true },
  });

  console.log('Updated FULL-005:', JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SCRIPT_ERROR:', e.message);
  process.exit(1);
});
