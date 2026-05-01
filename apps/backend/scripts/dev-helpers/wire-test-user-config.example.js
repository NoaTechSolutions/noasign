/**
 * DEVELOPMENT HELPER - UserDocumentConfig wire-up
 *
 * Purpose: Quickly assign FormDefinition + SignatureTemplate to a user
 *          for testing without admin UI.
 *
 * Usage: Edit IDs, then run: node scripts/dev-helpers/wire-test-user-config.example.js
 *
 * Note: This is a DEV-ONLY script. Never run in production.
 *
 * Created during: NOA-53 testing (auto-calc validation)
 *
 * Idempotent: upserts FormDefinition by name and UserDocumentConfig by its
 * composite unique key — safe to run multiple times.
 *
 * Cleanup after testing:
 *   DELETE FROM user_document_configs WHERE id = '<reported>';
 *   DELETE FROM form_definitions WHERE id = '<reported>';
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const FORM_NAME = 'Construction Invoice - Auto-calc TEST';
const DOC_TYPE_CODE = 'CONSTRUCTION_CONTRACT';
const USER_EMAIL = 'master@ntssign.test';

// Schema MUST match DocumentSchema in document-form-renderer.tsx:
//   sections[].{ key, label, fields[] }
//   field.autoCalculate.sum uses { type: "sum", fields: [...] }  (NOT "sources")
const SCHEMA = {
  sections: [
    {
      key: 'services',
      label: 'Services',
      fields: [
        { key: 'invoice_number', label: 'Invoice #', type: 'text', defaultValue: 'INV-0001' },
        { key: 'service_1_price', label: 'Service 1', type: 'currency', row: 'r1' },
        { key: 'service_2_price', label: 'Service 2', type: 'currency', row: 'r1' },
        { key: 'service_3_price', label: 'Service 3', type: 'currency', row: 'r1' },
        {
          key: 'subtotal',
          label: 'Subtotal',
          type: 'currency',
          autoCalculate: {
            type: 'sum',
            fields: ['service_1_price', 'service_2_price', 'service_3_price'],
          },
        },
        {
          key: 'total',
          label: 'Total',
          type: 'currency',
          autoCalculate: { type: 'copy', source: 'subtotal' },
        },
      ],
    },
  ],
};

(async () => {
  const user = await p.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User ${USER_EMAIL} not found`);

  const docType = await p.documentType.findUnique({ where: { code: DOC_TYPE_CODE } });
  if (!docType) throw new Error(`DocumentType ${DOC_TYPE_CODE} not found`);

  const sigTemplate = await p.signatureTemplate.findFirst({
    where: { documentTypeId: docType.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!sigTemplate)
    throw new Error(`No active SignatureTemplate for ${DOC_TYPE_CODE}`);

  const result = await p.$transaction(async (tx) => {
    const existingForm = await tx.formDefinition.findFirst({
      where: { name: FORM_NAME, documentTypeId: docType.id },
    });

    const form = existingForm
      ? await tx.formDefinition.update({
          where: { id: existingForm.id },
          data: { schemaJson: SCHEMA, isActive: true },
        })
      : await tx.formDefinition.create({
          data: {
            name: FORM_NAME,
            documentTypeId: docType.id,
            schemaJson: SCHEMA,
            description: 'Auto-generated for auto-calc E2E testing',
            isActive: true,
          },
        });

    const config = await tx.userDocumentConfig.upsert({
      where: {
        userId_documentTypeId_formDefinitionId_signatureTemplateId: {
          userId: user.id,
          documentTypeId: docType.id,
          formDefinitionId: form.id,
          signatureTemplateId: sigTemplate.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: user.id,
        documentTypeId: docType.id,
        formDefinitionId: form.id,
        signatureTemplateId: sigTemplate.id,
        isActive: true,
      },
    });

    return { form, config, formCreated: !existingForm };
  });

  console.log('=== WIRE-UP COMPLETE ===');
  console.log(`User:               ${user.id}  (${user.email})`);
  console.log(`DocumentType:       ${docType.id}  (${docType.code})`);
  console.log(`SignatureTemplate:  ${sigTemplate.id}  (${sigTemplate.name})`);
  console.log(
    `FormDefinition:     ${result.form.id}  (${result.formCreated ? 'CREATED' : 'UPDATED'})  ${result.form.name}`,
  );
  console.log(`UserDocumentConfig: ${result.config.id}  (active=${result.config.isActive})`);

  console.log('\nCleanup SQL:');
  console.log(`  DELETE FROM user_document_configs WHERE id = '${result.config.id}';`);
  console.log(`  DELETE FROM form_definitions WHERE id = '${result.form.id}';`);

  await p.$disconnect();
})().catch(async (e) => {
  console.error('FAILED:', e.message);
  await p.$disconnect().catch(() => {});
  process.exit(1);
});
