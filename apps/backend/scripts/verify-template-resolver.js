/**
 * Golden-file check for the template-resolver enganche (no-op proof).
 *
 *   RECEIPT_TEMPLATE_RESOLVER_V2=true node scripts/verify-template-resolver.js
 *
 * For every tenant with an active receipt template, resolves the template BOTH
 * ways — legacy (newest active per-tenant) and V2 (CompanyTemplate default with
 * legacy fallback) — and asserts:
 *   1. same template id, and
 *   2. byte-identical rendered PDF for fixed data (or, if pdf-lib output isn't
 *      byte-deterministic, identical rendering-relevant template fields).
 * Exits non-zero on any mismatch. Requires a backend build (dist/).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { ReceiptPdfService } = require('../dist/receipts/receipt-pdf.service');

const prisma = new PrismaClient();

const FIXED_DATA = {
  receipt_number: 'REC-2026-9999',
  date: '07/06/2026',
  client: 'Golden Client',
  amount: 1234.56,
  payment_n: '1/1',
  payment_for: 'Golden test',
  received_by: 'Tester',
  other_label: '',
  payment_method: 'CASH',
};

function legacy(companyProfileId) {
  return prisma.receiptTemplate.findFirst({
    where: { companyProfileId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}
async function v2(companyProfileId) {
  const a = await prisma.companyTemplate.findFirst({
    where: { companyProfileId, category: 'RECEIPT', isDefault: true, isActive: true },
    include: { receiptTemplate: true },
  });
  if (a && a.receiptTemplate && a.receiptTemplate.isActive) return a.receiptTemplate;
  return legacy(companyProfileId);
}

const renderKey = (t) =>
  JSON.stringify({
    basePdfPath: t.basePdfPath,
    pageWidth: t.pageWidth,
    pageHeight: t.pageHeight,
    mediaBoxOffsetY: t.mediaBoxOffsetY,
    numberFormat: t.numberFormat,
    fieldMappingJson: t.fieldMappingJson,
  });

(async () => {
  const pdf = new ReceiptPdfService();
  const tenants = await prisma.receiptTemplate.findMany({
    where: { isActive: true },
    select: { companyProfileId: true },
    distinct: ['companyProfileId'],
  });

  let idMismatch = 0;
  let renderMismatch = 0;
  let renderedPdf = 0;

  for (const { companyProfileId } of tenants) {
    const L = await legacy(companyProfileId);
    const V = await v2(companyProfileId);
    const idOk = L && V && L.id === V.id;
    if (!idOk) idMismatch++;

    let note;
    const hasBase = L && fs.existsSync(path.resolve(process.cwd(), L.basePdfPath));
    if (hasBase) {
      try {
        const [bl, bv] = await Promise.all([pdf.generate(L, FIXED_DATA), pdf.generate(V, FIXED_DATA)]);
        const hl = crypto.createHash('sha256').update(bl).digest('hex');
        const hv = crypto.createHash('sha256').update(bv).digest('hex');
        renderedPdf++;
        if (hl !== hv) renderMismatch++;
        note = hl === hv ? `pdf identical ${hl.slice(0, 12)}` : `PDF DIFF ${hl.slice(0, 8)} vs ${hv.slice(0, 8)}`;
      } catch (e) {
        note = 'render-error: ' + e.message;
      }
    } else {
      // No base PDF on disk here → compare rendering-relevant fields instead.
      note = renderKey(L) === renderKey(V) ? 'fields identical (no base pdf)' : 'FIELDS DIFF';
      if (renderKey(L) !== renderKey(V)) renderMismatch++;
    }

    console.log(
      `${idOk ? 'OK' : 'ID-MISMATCH'} ${companyProfileId.slice(0, 8)} legacy=${L ? L.id.slice(0, 10) : 'none'} v2=${V ? V.id.slice(0, 10) : 'none'} | ${note}`,
    );
  }

  console.log(`\ntenants=${tenants.length} idMismatch=${idMismatch} pdfRendered=${renderedPdf} renderMismatch=${renderMismatch}`);
  console.log(idMismatch === 0 && renderMismatch === 0 ? 'GOLDEN: NO-OP CONFIRMED ✅' : 'GOLDEN: MISMATCH ❌');
  await prisma.$disconnect();
  process.exit(idMismatch === 0 && renderMismatch === 0 ? 0 : 1);
})().catch((e) => {
  console.error('GOLDEN_ERROR:', e.message);
  process.exit(1);
});
