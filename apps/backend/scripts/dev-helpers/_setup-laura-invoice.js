// Throwaway one-shot — sets up Laura Bravo's custom Invoice form:
//   - Reuses DocumentType INVOICE (created by _setup-invoice-test.js)
//   - Creates FormDefinition "Invoice - Laura Bravo" (custom 31-field schema)
//   - Reuses (or creates) SignatureTemplate "Invoice (placeholder)" PLACEHOLDER_NOT_SENDABLE
//   - Wires UserDocumentConfig laura.bravo@ntssign.test → form + template
//
// NOA-268 — Linear issue. Idempotent — safe to re-run; all upserts.
//
// Line totals are MANUAL (no autoCalculate). The renderer only supports `sum`
// and `copy` autoCalculate types — qty × unitPrice multiplication is a future
// renderer enhancement (separate ticket). Subtotal/Total still auto-sum.
//
// Requires Laura's user to exist already — run _setup-invoice-test.js first
// (it creates Laura's account + Laura Bravo Company).

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const LAURA_EMAIL = 'laura.bravo@ntssign.test';
const DOC_TYPE_CODE = 'INVOICE';
const DOC_TYPE_NAME = 'Invoice';
const FORM_NAME = 'Invoice - Laura Bravo';
const SIG_TEMPLATE_NAME = 'Invoice (placeholder)';
const PLACEHOLDER_PROVIDER_ID = 'PLACEHOLDER_NOT_SENDABLE';

const SCHEMA = {
  sections: [
    {
      key: 'invoice_info',
      label: 'Invoice Information',
      fields: [
        { key: 'invoice_number', label: 'Invoice Number', type: 'text', required: true },
        { key: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
      ],
    },
    {
      key: 'beneficiary',
      label: 'Beneficiary Information',
      fields: [
        { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true, transform: 'titleCase' },
        { key: 'beneficiary_rut', label: 'RUT', type: 'text', required: true, placeholder: '12.345.678-9' },
      ],
    },
    {
      key: 'services',
      label: 'Services & Line Items',
      fields: [
        { key: 'service_description', label: 'Service Description', type: 'textarea', required: true },

        { key: 'item1Description', label: 'Item 1 — Description', type: 'text' },
        { key: 'item1Quantity',    label: 'Qty',         type: 'number',   row: 'item1' },
        { key: 'item1UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item1' },
        { key: 'item1LineTotal',   label: 'Line Total',  type: 'currency', row: 'item1' },

        { key: 'item2Description', label: 'Item 2 — Description', type: 'text' },
        { key: 'item2Quantity',    label: 'Qty',         type: 'number',   row: 'item2' },
        { key: 'item2UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item2' },
        { key: 'item2LineTotal',   label: 'Line Total',  type: 'currency', row: 'item2' },

        { key: 'item3Description', label: 'Item 3 — Description', type: 'text' },
        { key: 'item3Quantity',    label: 'Qty',         type: 'number',   row: 'item3' },
        { key: 'item3UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item3' },
        { key: 'item3LineTotal',   label: 'Line Total',  type: 'currency', row: 'item3' },

        { key: 'item4Description', label: 'Item 4 — Description', type: 'text' },
        { key: 'item4Quantity',    label: 'Qty',         type: 'number',   row: 'item4' },
        { key: 'item4UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item4' },
        { key: 'item4LineTotal',   label: 'Line Total',  type: 'currency', row: 'item4' },

        { key: 'item5Description', label: 'Item 5 — Description', type: 'text' },
        { key: 'item5Quantity',    label: 'Qty',         type: 'number',   row: 'item5' },
        { key: 'item5UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item5' },
        { key: 'item5LineTotal',   label: 'Line Total',  type: 'currency', row: 'item5' },
      ],
    },
    {
      key: 'amounts',
      label: 'Amounts',
      fields: [
        {
          key: 'subtotal',
          label: 'Subtotal',
          type: 'currency',
          autoCalculate: {
            type: 'sum',
            fields: ['item1LineTotal', 'item2LineTotal', 'item3LineTotal', 'item4LineTotal', 'item5LineTotal'],
          },
        },
        { key: 'tax_amount', label: 'Tax (IVA 19% — calculate and enter manually)', type: 'currency' },
        {
          key: 'total_amount',
          label: 'Total',
          type: 'currency',
          autoCalculate: { type: 'sum', fields: ['subtotal', 'tax_amount'] },
        },
      ],
    },
    {
      key: 'payment',
      label: 'Payment Information',
      fields: [
        { key: 'payment_terms', label: 'Payment Terms', type: 'text', placeholder: 'e.g., Net 30' },
        { key: 'bank_name',     label: 'Bank Name',     type: 'text' },
        { key: 'bank_account',  label: 'Account Number', type: 'text' },
      ],
    },
  ],
};

(async () => {
  const laura = await prisma.user.findUnique({ where: { email: LAURA_EMAIL } });
  if (!laura) {
    throw new Error(
      `User ${LAURA_EMAIL} not found — run _setup-invoice-test.js first (it creates Laura).`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const docType = await tx.documentType.upsert({
      where: { code: DOC_TYPE_CODE },
      update: { name: DOC_TYPE_NAME },
      create: { code: DOC_TYPE_CODE, name: DOC_TYPE_NAME },
    });

    const existingForm = await tx.formDefinition.findFirst({
      where: { name: FORM_NAME, documentTypeId: docType.id },
    });
    const form = existingForm
      ? await tx.formDefinition.update({
          where: { id: existingForm.id },
          data: {
            schemaJson: SCHEMA,
            description: 'Custom invoice form for Laura Bravo (NOA-268)',
            isActive: true,
          },
        })
      : await tx.formDefinition.create({
          data: {
            name: FORM_NAME,
            documentTypeId: docType.id,
            schemaJson: SCHEMA,
            description: 'Custom invoice form for Laura Bravo (NOA-268)',
            isActive: true,
          },
        });

    const existingSig = await tx.signatureTemplate.findFirst({
      where: { name: SIG_TEMPLATE_NAME, documentTypeId: docType.id },
    });
    const sigTemplate = existingSig
      ? await tx.signatureTemplate.update({
          where: { id: existingSig.id },
          data: {
            providerTemplateId: PLACEHOLDER_PROVIDER_ID,
            recipientRole: 'Client',
            isActive: true,
          },
        })
      : await tx.signatureTemplate.create({
          data: {
            name: SIG_TEMPLATE_NAME,
            documentTypeId: docType.id,
            providerTemplateId: PLACEHOLDER_PROVIDER_ID,
            recipientRole: 'Client',
            isActive: true,
          },
        });

    const config = await tx.userDocumentConfig.upsert({
      where: {
        userId_documentTypeId_formDefinitionId_signatureTemplateId: {
          userId: laura.id,
          documentTypeId: docType.id,
          formDefinitionId: form.id,
          signatureTemplateId: sigTemplate.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: laura.id,
        documentTypeId: docType.id,
        formDefinitionId: form.id,
        signatureTemplateId: sigTemplate.id,
        isActive: true,
      },
    });

    return {
      docType,
      form,
      sigTemplate,
      config,
      formCreated: !existingForm,
      sigCreated: !existingSig,
    };
  });

  const fieldCount = SCHEMA.sections.reduce((acc, s) => acc + s.fields.length, 0);

  console.log('=== LAURA INVOICE FORM SETUP COMPLETE ===\n');
  console.log(`User Laura                ${laura.id}  ${laura.email}`);
  console.log(`DocumentType ${result.docType.code}        ${result.docType.id}  ${result.docType.name}`);
  console.log(
    `FormDefinition (${result.formCreated ? 'CREATED' : 'UPDATED'})   ${result.form.id}  ${result.form.name}  (${SCHEMA.sections.length} sections, ${fieldCount} fields)`,
  );
  console.log(
    `SignatureTemplate (${result.sigCreated ? 'CREATED' : 'EXISTING'}) ${result.sigTemplate.id}  ${result.sigTemplate.name}  providerId=${result.sigTemplate.providerTemplateId}`,
  );
  console.log(
    `UserDocumentConfig        ${result.config.id}  active=${result.config.isActive}  (Laura → ${FORM_NAME})`,
  );

  console.log('\n=== Cleanup SQL (Laura-specific only) ===');
  console.log(`DELETE FROM user_document_configs WHERE id = '${result.config.id}';`);
  console.log(`DELETE FROM form_definitions WHERE id = '${result.form.id}';`);
  console.log('-- DocumentType + SignatureTemplate NOT removed (shared with master Invoice Form).');

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('FAILED:', e.message);
  if (e.stack) console.error(e.stack);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
