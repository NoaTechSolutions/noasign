// Throwaway one-shot — sets up Laura Bravo's custom Invoice form:
//   - Reuses DocumentType INVOICE (created by _setup-invoice-test.js)
//   - Creates/updates FormDefinition "Invoice - Laura Bravo"
//     (3 sections — Beneficiary, Services with dynamic line_items, Payment)
//   - Reuses (or creates) SignatureTemplate "Invoice (placeholder)" PLACEHOLDER_NOT_SENDABLE
//   - Wires UserDocumentConfig laura.bravo@ntssign.test → form + template
//
// NOA-268 + NOA-270 + NOA-272. Idempotent — safe to re-run; all upserts.
// Re-running updates the existing FormDefinition in place, preserving its id
// so the UserDocumentConfig FK keeps working without touching it.
//
// Renderer extensions used:
//   - hideWhen (NOA-270): inverse of showWhen (hide field when toggle ON)
//   - autoCalculate "multiply" (NOA-270): line_total = qty × unit_price
//   - dynamic_array (NOA-272): Services adds/removes 0-10 items at runtime
//   - autoCalculate "sum" with wildcard (NOA-272): grand_total aggregates
//     across array items via "line_items[*].line_total"
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
    // NOA-272 Phase 2: services is now a dynamic_array (0-10 items, Laura
    // adds/removes on demand). Each item auto-calculates line_total via
    // per-item multiply (qty × unit_price). grand_total uses wildcard sum
    // over the array (line_items[*].line_total) and lives at the bottom
    // of Services (Amounts section was already removed in Phase 1).
    // NOA-272 Chunk 1 feedback: removed `service_description` (redundant —
    // each item already has its own Description). Per-item layout: Description
    // full-width (no row), then Qty + Unit Price + Line Total in a row of 3
    // (all share row='item'). Renderer respects itemField `row` via groupFields.
    {
      key: 'services',
      label: 'Services',
      fields: [
        {
          key: 'line_items',
          label: 'Services',
          type: 'dynamic_array',
          // minItems = initial seeded count (NOT a Remove-disabled constraint).
          // Form opens with Item 1 visible; user can still Remove down to 0
          // and Add back up. Per Chunk 1 feedback.
          minItems: 1,
          maxItems: 10,
          addButtonLabel: 'Add Service',
          removeButtonLabel: 'Remove',
          itemFields: [
            { key: 'description', label: 'Description', type: 'text', required: true },
            { key: 'qty',         label: 'Qty',         type: 'number',   required: true, row: 'item' },
            { key: 'unit_price',  label: 'Unit Price',  type: 'currency', required: true, row: 'item' },
            {
              key: 'line_total',
              label: 'Line Total',
              type: 'currency',
              row: 'item',
              autoCalculate: { type: 'multiply', fields: ['qty', 'unit_price'] },
            },
          ],
        },

        {
          key: 'grand_total',
          label: 'Grand Total',
          type: 'currency',
          autoCalculate: {
            type: 'sum',
            fields: ['line_items[*].line_total'],
          },
        },
      ],
    },
    // NOA-272 Chunk 1 feedback: Payment Information temporarily hidden.
    // Schema kept commented for easy restoration when needed.
    // {
    //   key: 'payment',
    //   label: 'Payment Information',
    //   fields: [
    //     { key: 'payment_terms', label: 'Payment Terms', type: 'text', placeholder: 'e.g., Net 30' },
    //     { key: 'bank_name',     label: 'Bank Name',     type: 'text' },
    //     { key: 'bank_account',  label: 'Account Number', type: 'text' },
    //   ],
    // },
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
