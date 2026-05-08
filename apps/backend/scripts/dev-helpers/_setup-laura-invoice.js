// Throwaway one-shot — sets up Laura Bravo's custom Invoice form:
//   - Reuses DocumentType INVOICE (created by _setup-invoice-test.js)
//   - Creates/updates FormDefinition "Invoice - Laura Bravo"
//     (3 sections, 33 fields — NOA-270 Phase 1)
//   - Reuses (or creates) SignatureTemplate "Invoice (placeholder)" PLACEHOLDER_NOT_SENDABLE
//   - Wires UserDocumentConfig laura.bravo@ntssign.test → form + template
//
// NOA-268 + NOA-270 (Phase 1). Idempotent — safe to re-run; all upserts.
// Re-running updates the existing FormDefinition in place, preserving its id
// so the UserDocumentConfig FK keeps working without touching it.
//
// Phase 1 uses two renderer extensions added in the same NOA-270 commit:
//   - hideWhen: inverse of showWhen (hide field when toggle ON)
//   - autoCalculate { type: "multiply", fields: [...] }: line_total = qty × price
//
// Dynamic line items (add/remove, max 5) are deferred to Phase 2 — current
// schema still uses 5 fixed items, but each line_total now auto-multiplies.
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
    // NOA-270 Phase 1: Beneficiary uses mutual-exclusion via hideWhen +
    // showWhen on the same isBusiness toggle. Personal fields hide when
    // toggle is ON; business fields show when toggle is ON. Address fields
    // are always visible (apply to both beneficiary types).
    // NOA-270 — keys follow conventional names (first_name, last_name,
    // business_name, contact_person, address, city, state, zip) so the
    // generic customerInitialValues/initialToggles prefill works when a
    // customer is selected from "Use a customer". The `isBusiness` toggle
    // auto-flips based on customer.customerType (convention-based, see
    // CreateDraftDrawer).
    {
      key: 'beneficiary',
      label: 'Beneficiary Information',
      toggles: [
        { key: 'isBusiness', label: 'This is a business beneficiary', defaultValue: false },
      ],
      fields: [
        // Personal — hide when isBusiness ON
        { key: 'first_name', label: 'First Name', type: 'text', required: true, transform: 'titleCase', row: 'name', hideWhen: 'isBusiness' },
        { key: 'last_name',  label: 'Last Name',  type: 'text', required: true, transform: 'titleCase', row: 'name', hideWhen: 'isBusiness' },
        // Business — show when isBusiness ON
        { key: 'business_name',   label: 'Business Name',   type: 'text', required: true, showWhen: 'isBusiness', transform: 'titleCase', row: 'business' },
        { key: 'contact_person',  label: 'Contact Person',  type: 'text', showWhen: 'isBusiness', transform: 'titleCase', row: 'business' },
        // Always visible — address
        { key: 'address', label: 'Address',         type: 'text', required: true },
        { key: 'city',    label: 'City',            type: 'text', required: true, row: 'csz' },
        { key: 'state',   label: 'State/Province',  type: 'text', required: true, row: 'csz' },
        { key: 'zip',     label: 'Zip/Postal Code', type: 'text', required: true, row: 'csz' },
      ],
    },
    // NOA-270 Phase 1: each line_total auto-multiplies (qty × unit_price);
    // grand_total auto-sums all 5 line_totals. The "Amounts" section was
    // dropped — grand_total now lives at the bottom of Services. Tax/IVA
    // is deferred (Phase 2 once the renderer supports multiply-by-constant
    // for percentages, or restored as a manual field if Laura needs it).
    {
      key: 'services',
      label: 'Services',
      fields: [
        { key: 'service_description', label: 'Service Description', type: 'textarea', required: true },

        { key: 'item1Description', label: 'Item 1 — Description', type: 'text' },
        { key: 'item1Quantity',    label: 'Qty',         type: 'number',   row: 'item1' },
        { key: 'item1UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item1' },
        { key: 'item1LineTotal',   label: 'Line Total',  type: 'currency', row: 'item1', autoCalculate: { type: 'multiply', fields: ['item1Quantity', 'item1UnitPrice'] } },

        { key: 'item2Description', label: 'Item 2 — Description', type: 'text' },
        { key: 'item2Quantity',    label: 'Qty',         type: 'number',   row: 'item2' },
        { key: 'item2UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item2' },
        { key: 'item2LineTotal',   label: 'Line Total',  type: 'currency', row: 'item2', autoCalculate: { type: 'multiply', fields: ['item2Quantity', 'item2UnitPrice'] } },

        { key: 'item3Description', label: 'Item 3 — Description', type: 'text' },
        { key: 'item3Quantity',    label: 'Qty',         type: 'number',   row: 'item3' },
        { key: 'item3UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item3' },
        { key: 'item3LineTotal',   label: 'Line Total',  type: 'currency', row: 'item3', autoCalculate: { type: 'multiply', fields: ['item3Quantity', 'item3UnitPrice'] } },

        { key: 'item4Description', label: 'Item 4 — Description', type: 'text' },
        { key: 'item4Quantity',    label: 'Qty',         type: 'number',   row: 'item4' },
        { key: 'item4UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item4' },
        { key: 'item4LineTotal',   label: 'Line Total',  type: 'currency', row: 'item4', autoCalculate: { type: 'multiply', fields: ['item4Quantity', 'item4UnitPrice'] } },

        { key: 'item5Description', label: 'Item 5 — Description', type: 'text' },
        { key: 'item5Quantity',    label: 'Qty',         type: 'number',   row: 'item5' },
        { key: 'item5UnitPrice',   label: 'Unit Price',  type: 'currency', row: 'item5' },
        { key: 'item5LineTotal',   label: 'Line Total',  type: 'currency', row: 'item5', autoCalculate: { type: 'multiply', fields: ['item5Quantity', 'item5UnitPrice'] } },

        {
          key: 'grand_total',
          label: 'Grand Total',
          type: 'currency',
          autoCalculate: {
            type: 'sum',
            fields: ['item1LineTotal', 'item2LineTotal', 'item3LineTotal', 'item4LineTotal', 'item5LineTotal'],
          },
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
