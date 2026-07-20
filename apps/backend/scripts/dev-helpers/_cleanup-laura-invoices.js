// LOCAL dev-helper (untracked): delete laura.test's INVOICE documents + reset the
// invoice number counters so a fresh full test starts at INV-2026-0001.
//   node scripts/dev-helpers/_cleanup-laura-invoices.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const EMAIL = 'laura.test@ntssign.test';

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (!user?.companyProfileId) throw new Error('laura.test not found — run _setup-laura-test.js');
    const docType = await prisma.documentType.findUnique({ where: { code: 'INVOICE' } });
    if (!docType) throw new Error('INVOICE document type missing');

    const docs = await prisma.document.findMany({
      where: { companyProfileId: user.companyProfileId, documentTypeId: docType.id },
      select: { id: true },
    });
    const ids = docs.map((d) => d.id);
    if (ids.length) {
      await prisma.documentFile.deleteMany({ where: { documentId: { in: ids } } });
      await prisma.documentVersion.deleteMany({ where: { documentId: { in: ids } } });
      await prisma.documentData.deleteMany({ where: { documentId: { in: ids } } });
      await prisma.document.deleteMany({ where: { id: { in: ids } } });
    }
    // Reset counters so numbering restarts at 0001 / 000001.
    await prisma.documentSeriesCounter.deleteMany({
      where: { companyProfileId: user.companyProfileId, documentTypeId: docType.id },
    });
    await prisma.userDocumentSequence.deleteMany({
      where: { userId: user.id, documentTypeId: docType.id },
    });

    console.log(`Deleted ${ids.length} invoice document(s) + reset counters for ${EMAIL}`);
    await prisma.$disconnect();
  } catch (e) {
    console.error('CLEANUP_ERROR:', e && e.stack ? e.stack : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
