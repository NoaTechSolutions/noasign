/**
 * Seeds a second document type for jane.smith — "Constancia de Pago"
 * (PAYMENT_RECEIPT) — as a placeholder so the Documents setup flow has more than
 * one type to choose from. Signature template is a placeholder (no real BoldSign
 * template), so created docs can't be sent for signature yet.
 *
 * Idempotent (upsert by stable ids/codes). Run:
 *   node scripts/dev-helpers/_seed-payment-receipt-doc-type.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JANE_ID = '9f339c28-3cd0-479a-afda-d97af327aa40';
const FORM_ID = 'payment-receipt-form-jane';
const TEMPLATE_ID = 'payment-receipt-template-jane';

async function main() {
  // 1. DocumentType
  const docType = await prisma.documentType.upsert({
    where: { code: 'PAYMENT_RECEIPT' },
    create: { name: 'Constancia de Pago', code: 'PAYMENT_RECEIPT' },
    update: {},
  });

  // 2. FormDefinition (client + payment sections)
  const formDef = await prisma.formDefinition.upsert({
    where: { id: FORM_ID },
    create: {
      id: FORM_ID,
      name: 'Payment Receipt Form',
      documentTypeId: docType.id,
      isActive: true,
      schemaJson: {
        sections: [
          {
            key: 'client',
            label: 'Client',
            fields: [
              { key: 'customer_name', label: 'Customer Name', type: 'text', required: true },
              { key: 'customer_email', label: 'Email', type: 'email', required: true },
              { key: 'customer_phone', label: 'Phone', type: 'phone', required: false },
              { key: 'customer_address', label: 'Address', type: 'text', required: false },
            ],
          },
          {
            key: 'payment',
            label: 'Payment',
            fields: [
              { key: 'payment_amount', label: 'Amount', type: 'currency', required: true },
              { key: 'payment_date', label: 'Payment Date', type: 'date', required: true },
              {
                key: 'payment_method',
                label: 'Payment Method',
                type: 'select',
                required: true,
                options: ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Zelle'],
              },
              { key: 'payment_reference', label: 'Reference #', type: 'text', required: false },
              { key: 'payment_description', label: 'Description', type: 'textarea', required: false },
            ],
          },
        ],
      },
    },
    update: {},
  });

  // 3. SignatureTemplate (placeholder)
  const sigTemplate = await prisma.signatureTemplate.upsert({
    where: { id: TEMPLATE_ID },
    create: {
      id: TEMPLATE_ID,
      name: 'Payment Receipt Template (Placeholder)',
      documentTypeId: docType.id,
      providerTemplateId: 'PLACEHOLDER_PAYMENT_RECEIPT',
      recipientRole: 'Client',
      isActive: true,
    },
    update: {},
  });

  // 4. UserDocumentConfig → jane.smith
  await prisma.userDocumentConfig.upsert({
    where: {
      userId_documentTypeId_formDefinitionId_signatureTemplateId: {
        userId: JANE_ID,
        documentTypeId: docType.id,
        formDefinitionId: formDef.id,
        signatureTemplateId: sigTemplate.id,
      },
    },
    create: {
      userId: JANE_ID,
      documentTypeId: docType.id,
      formDefinitionId: formDef.id,
      signatureTemplateId: sigTemplate.id,
      isActive: true,
    },
    update: {},
  });

  // Verify the DOD: jane should now see 2 document types.
  const configs = await prisma.userDocumentConfig.findMany({
    where: { userId: JANE_ID, isActive: true },
    include: { documentType: { select: { name: true, code: true } } },
  });
  const types = [...new Set(configs.map((c) => c.documentType.code))];
  console.log('DocumentType:', docType.code, docType.id);
  console.log('FormDefinition:', formDef.id);
  console.log('SignatureTemplate:', sigTemplate.id);
  console.log(`jane active configs: ${configs.length} | distinct types: ${types.length}`);
  console.log(JSON.stringify(configs.map((c) => c.documentType), null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SEED_ERROR:', e.message);
  process.exit(1);
});
