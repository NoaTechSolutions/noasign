// Throwaway one-shot — seeds 6 invoice documents for Laura Bravo, one in
// each status (DRAFT, SENT, VIEWED, SIGNED, COMPLETED, CANCELLED), with
// realistic timestamps and dataJson shapes (mix of personal/business
// beneficiaries, varying line item counts).
//
// Used to validate NOA-281 (Timeline filtering by real timestamps) and
// NOA-280 (schema-driven DocumentViewer in readOnly mode).
//
// Idempotent — deletes existing INV-2026-001..006 first, then recreates.
// Safe to re-run.
//
// Notes:
// - dataJson lives in a separate DocumentData table (Document.data 1:1
//   relation). Prisma nested create handles it.
// - dataJson uses the flat-key bracket-notation submission shape that
//   NOA-272 ships (line_items[N].field, grand_total at top level).
// - Business docs deliberately leave first_name/last_name absent (the
//   renderer's hideWhen=isBusiness blanks them on submit). The viewer
//   in NOA-280 deduces isBusiness from the presence of business_name.
// - Cancelled doc has cancelledAt AFTER viewedAt (typical real-world
//   sequence). Timestamps are spread to look natural.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LAURA_EMAIL = 'laura.bravo@ntssign.test';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function buildDataJson({ isBusiness, customer, items }) {
  const data = {};
  if (isBusiness) {
    data.business_name = customer.businessName;
    data.contact_person = customer.contactPerson;
  } else {
    data.first_name = customer.firstName;
    data.last_name = customer.lastName;
  }
  data.address = customer.address;
  data.city = customer.city;
  data.state = customer.state;
  data.zip = customer.zip;

  let grandTotal = 0;
  items.forEach((item, i) => {
    const lineTotal = (
      parseFloat(item.qty || '0') * parseFloat(item.unitPrice || '0')
    ).toFixed(2);
    data[`line_items[${i}].description`] = item.description;
    data[`line_items[${i}].qty`] = String(item.qty);
    data[`line_items[${i}].unit_price`] = String(item.unitPrice);
    data[`line_items[${i}].line_total`] = lineTotal;
    grandTotal += parseFloat(lineTotal);
  });
  data.grand_total = grandTotal.toFixed(2);
  return data;
}

const DOCS = [
  {
    documentNumber: 'INV-2026-001',
    status: 'DRAFT',
    timestamps: { createdAt: daysAgo(1) },
    dataJson: buildDataJson({
      isBusiness: false,
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Lima',
        state: 'Lima',
        zip: '15046',
      },
      items: [{ description: 'Website design', qty: '1', unitPrice: '500' }],
    }),
  },
  {
    documentNumber: 'INV-2026-002',
    status: 'SENT',
    timestamps: { createdAt: daysAgo(5), sentAt: daysAgo(4) },
    dataJson: buildDataJson({
      isBusiness: false,
      customer: {
        firstName: 'Jane',
        lastName: 'Smith',
        address: '456 Oak Ave',
        city: 'Lima',
        state: 'Lima',
        zip: '15001',
      },
      items: [
        { description: 'Logo design', qty: '1', unitPrice: '250' },
        { description: 'Brand guidelines', qty: '1', unitPrice: '150' },
      ],
    }),
  },
  {
    documentNumber: 'INV-2026-003',
    status: 'VIEWED',
    timestamps: {
      createdAt: daysAgo(7),
      sentAt: daysAgo(6),
      viewedAt: daysAgo(5),
    },
    dataJson: buildDataJson({
      isBusiness: false,
      customer: {
        firstName: 'Carlos',
        lastName: 'Mendoza',
        address: 'Av. Arequipa 1234',
        city: 'Lima',
        state: 'Lima',
        zip: '15046',
      },
      items: [
        { description: 'Consultoría inicial', qty: '4', unitPrice: '120' },
        { description: 'Setup de hosting', qty: '1', unitPrice: '80' },
        { description: 'Migración de datos', qty: '8', unitPrice: '60' },
      ],
    }),
  },
  {
    documentNumber: 'INV-2026-004',
    status: 'SIGNED',
    timestamps: {
      createdAt: daysAgo(10),
      sentAt: daysAgo(9),
      viewedAt: daysAgo(8),
      signedAt: daysAgo(7),
    },
    dataJson: buildDataJson({
      isBusiness: true,
      customer: {
        businessName: 'Constructora San Martin SAC',
        contactPerson: 'Roberto Gonzales',
        address: 'Av. Javier Prado 2500',
        city: 'San Isidro',
        state: 'Lima',
        zip: '15036',
      },
      items: [
        { description: 'Plan de marketing Q1', qty: '1', unitPrice: '2500' },
      ],
    }),
  },
  {
    documentNumber: 'INV-2026-005',
    status: 'COMPLETED',
    timestamps: {
      createdAt: daysAgo(14),
      sentAt: daysAgo(13),
      viewedAt: daysAgo(12),
      signedAt: daysAgo(11),
      completedAt: daysAgo(10),
    },
    dataJson: buildDataJson({
      isBusiness: true,
      customer: {
        businessName: 'Importaciones Del Sur EIRL',
        contactPerson: 'Sofia Ramirez',
        address: 'Jr. Carabaya 123',
        city: 'Lima',
        state: 'Lima',
        zip: '15001',
      },
      items: [
        { description: 'Auditoría web', qty: '1', unitPrice: '600' },
        { description: 'Optimización SEO', qty: '3', unitPrice: '400' },
        { description: 'Reporte mensual', qty: '6', unitPrice: '150' },
        { description: 'Soporte técnico', qty: '20', unitPrice: '50' },
        { description: 'Capacitación equipo', qty: '2', unitPrice: '300' },
      ],
    }),
  },
  {
    documentNumber: 'INV-2026-006',
    status: 'CANCELLED',
    timestamps: {
      createdAt: daysAgo(8),
      sentAt: daysAgo(7),
      viewedAt: daysAgo(6),
      cancelledAt: daysAgo(5),
    },
    dataJson: buildDataJson({
      isBusiness: true,
      customer: {
        businessName: 'Tech Solutions Peru SAC',
        contactPerson: 'Diego Vargas',
        address: 'Av. La Marina 1800',
        city: 'San Miguel',
        state: 'Lima',
        zip: '15088',
      },
      items: [
        { description: 'Análisis de requerimientos', qty: '8', unitPrice: '125' },
        { description: 'Propuesta técnica', qty: '1', unitPrice: '500' },
      ],
    }),
  },
];

(async () => {
  const laura = await prisma.user.findUnique({
    where: { email: LAURA_EMAIL },
    select: { id: true, email: true, companyProfileId: true },
  });
  if (!laura) {
    throw new Error(`User ${LAURA_EMAIL} not found — run _setup-invoice-test.js first.`);
  }
  if (!laura.companyProfileId) {
    throw new Error(`Laura has no companyProfileId — bootstrap her company first.`);
  }

  const config = await prisma.userDocumentConfig.findFirst({
    where: { userId: laura.id, isActive: true },
    include: { documentType: true },
  });
  if (!config) {
    throw new Error(
      `Laura has no active UserDocumentConfig — run _setup-laura-invoice.js first.`,
    );
  }

  console.log(`✅ Found Laura: ${laura.email}`);
  console.log(`   Config: docType=${config.documentType.code}, formDef=${config.formDefinitionId}, sigTemplate=${config.signatureTemplateId}\n`);

  const created = [];
  for (const doc of DOCS) {
    // Idempotent: drop any existing doc with this number (cascade clears
    // DocumentData via the Document.data relation onDelete: Cascade).
    await prisma.document.deleteMany({
      where: { documentNumber: doc.documentNumber },
    });

    const result = await prisma.document.create({
      data: {
        documentNumber: doc.documentNumber,
        userId: laura.id,
        companyProfileId: laura.companyProfileId,
        documentTypeId: config.documentTypeId,
        formDefinitionId: config.formDefinitionId,
        signatureTemplateId: config.signatureTemplateId,
        status: doc.status,
        contractDate: doc.timestamps.createdAt,
        ...doc.timestamps,
        data: { create: { dataJson: doc.dataJson } },
      },
      select: {
        id: true,
        documentNumber: true,
        status: true,
        createdAt: true,
        sentAt: true,
        viewedAt: true,
        signedAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
    created.push(result);
  }

  console.log(`✅ Seeded ${created.length} documents for Laura:\n`);
  for (const d of created) {
    const stamps = [
      d.createdAt && `created=${d.createdAt.toISOString().slice(0, 10)}`,
      d.sentAt && `sent=${d.sentAt.toISOString().slice(0, 10)}`,
      d.viewedAt && `viewed=${d.viewedAt.toISOString().slice(0, 10)}`,
      d.signedAt && `signed=${d.signedAt.toISOString().slice(0, 10)}`,
      d.completedAt && `completed=${d.completedAt.toISOString().slice(0, 10)}`,
      d.cancelledAt && `cancelled=${d.cancelledAt.toISOString().slice(0, 10)}`,
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`   - ${d.documentNumber}: ${d.status.padEnd(10)} ${stamps}`);
  }

  console.log('\n=== Cleanup SQL ===');
  console.log(
    `DELETE FROM documents WHERE "documentNumber" IN (${DOCS.map((d) => `'${d.documentNumber}'`).join(', ')});`,
  );
  console.log('-- Cascade clears document_data automatically.\n');

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('FAILED:', e.message);
  if (e.stack) console.error(e.stack);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
