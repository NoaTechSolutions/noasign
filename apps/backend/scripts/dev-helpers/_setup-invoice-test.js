// Throwaway one-shot — sets up an Invoice testing environment:
//   - DocumentType INVOICE
//   - FormDefinition "Invoice Form" with full schema (PERSONAL/BUSINESS toggle,
//     5 line items with manual line totals, sum-based totals)
//   - SignatureTemplate (active placeholder, PLACEHOLDER_NOT_SENDABLE — sending
//     to BoldSign will fail loud, form fill works)
//   - Laura Bravo + Laura Bravo Company (kept from prior setup, idempotent)
//   - UserDocumentConfig wiring master@ntssign.test to INVOICE for testing
//
// Linear: NOA-265 follow-up.
// Idempotent — safe to re-run; all upserts.
// Laura herself is NOT given a UserDocumentConfig (waiting for real BoldSign
// template + Laura's effective onboarding).

const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const LAURA_EMAIL = 'laura.bravo@ntssign.test';
const LAURA_PASSWORD = 'secret123';
const LAURA_COMPANY_NAME = 'Laura Bravo Company';
const MASTER_EMAIL = 'master@ntssign.test';

const DOC_TYPE_CODE = 'INVOICE';
const DOC_TYPE_NAME = 'Invoice';
const FORM_NAME = 'Invoice Form';
const SIG_TEMPLATE_NAME = 'Invoice (placeholder)';
const PLACEHOLDER_PROVIDER_ID = 'PLACEHOLDER_NOT_SENDABLE';

const SCHEMA = {
  sections: [
    {
      key: 'invoice_info',
      label: 'Invoice Info',
      fields: [
        { key: 'issueDate', label: 'Issue Date', type: 'date', required: true, row: 'dates' },
        {
          key: 'dueDate',
          label: 'Due Date',
          type: 'date',
          required: true,
          row: 'dates',
          validation: { minDateFrom: 'issueDate' },
        },
        {
          key: 'paymentTerms',
          label: 'Payment Terms',
          type: 'text',
          placeholder: 'e.g., Net 30, Due on receipt',
        },
      ],
    },
    {
      key: 'customer',
      label: 'Customer',
      toggles: [
        { key: 'isBusiness', label: 'This is a business customer', defaultValue: false },
      ],
      fields: [
        { key: 'fullName', label: 'Full Name', type: 'text', transform: 'titleCase', required: true },
        { key: 'email', label: 'Email', type: 'email', validation: { isEmail: true }, row: 'contact' },
        { key: 'phone', label: 'Phone', type: 'phone', row: 'contact' },
        { key: 'addressLine1', label: 'Address Line 1', type: 'text' },
        { key: 'addressLine2', label: 'Address Line 2', type: 'text' },
        { key: 'city', label: 'City', type: 'text', row: 'csz' },
        { key: 'state', label: 'State', type: 'text', row: 'csz' },
        { key: 'zipCode', label: 'Zip Code', type: 'text', row: 'csz' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'textarea' },

        { key: 'businessName', label: 'Business Name', type: 'text', transform: 'titleCase', showWhen: 'isBusiness', required: true },
        { key: 'businessLegalName', label: 'Business Legal Name', type: 'text', showWhen: 'isBusiness' },
        { key: 'licenseNumber', label: 'License Number', type: 'text', showWhen: 'isBusiness', row: 'biz_meta' },
        { key: 'industry', label: 'Industry', type: 'text', showWhen: 'isBusiness', row: 'biz_meta' },
        { key: 'website', label: 'Website', type: 'text', showWhen: 'isBusiness' },
        { key: 'businessEmail', label: 'Business Email', type: 'email', showWhen: 'isBusiness', validation: { isEmail: true }, row: 'biz_contact' },
        { key: 'businessPhone', label: 'Business Phone', type: 'phone', showWhen: 'isBusiness', row: 'biz_contact' },
        { key: 'businessPhone2', label: 'Business Phone (alt)', type: 'phone', showWhen: 'isBusiness' },
        { key: 'businessAddressLine1', label: 'Business Address Line 1', type: 'text', showWhen: 'isBusiness' },
        { key: 'businessAddressLine2', label: 'Business Address Line 2', type: 'text', showWhen: 'isBusiness' },
        { key: 'businessCity', label: 'City', type: 'text', showWhen: 'isBusiness', row: 'biz_csz' },
        { key: 'businessState', label: 'State', type: 'text', showWhen: 'isBusiness', row: 'biz_csz' },
        { key: 'businessZipCode', label: 'Zip Code', type: 'text', showWhen: 'isBusiness', row: 'biz_csz' },

        { key: 'primaryContactName', label: 'Primary Contact Name', type: 'text', transform: 'titleCase', showWhen: 'isBusiness' },
        { key: 'primaryContactTitle', label: 'Primary Contact Title', type: 'text', showWhen: 'isBusiness' },
        { key: 'primaryContactEmail', label: 'Primary Contact Email', type: 'email', showWhen: 'isBusiness', validation: { isEmail: true }, row: 'pc_contact' },
        { key: 'primaryContactPhone', label: 'Primary Contact Phone', type: 'phone', showWhen: 'isBusiness', row: 'pc_contact' },
        { key: 'primaryContactAddressLine1', label: 'Primary Contact Address Line 1', type: 'text', showWhen: 'isBusiness' },
        { key: 'primaryContactCity', label: 'City', type: 'text', showWhen: 'isBusiness', row: 'pc_csz' },
        { key: 'primaryContactState', label: 'State', type: 'text', showWhen: 'isBusiness', row: 'pc_csz' },
        { key: 'primaryContactZipCode', label: 'Zip Code', type: 'text', showWhen: 'isBusiness', row: 'pc_csz' },
      ],
    },
    {
      key: 'items',
      label: 'Items',
      fields: [
        { key: 'item1Description', label: 'Item 1 — Description', type: 'textarea' },
        { key: 'item1Quantity', label: 'Qty', type: 'number', row: 'item1' },
        { key: 'item1UnitPrice', label: 'Unit Price', type: 'currency', row: 'item1' },
        { key: 'item1LineTotal', label: 'Line Total', type: 'currency', row: 'item1' },

        { key: 'item2Description', label: 'Item 2 — Description', type: 'textarea' },
        { key: 'item2Quantity', label: 'Qty', type: 'number', row: 'item2' },
        { key: 'item2UnitPrice', label: 'Unit Price', type: 'currency', row: 'item2' },
        { key: 'item2LineTotal', label: 'Line Total', type: 'currency', row: 'item2' },

        { key: 'item3Description', label: 'Item 3 — Description', type: 'textarea' },
        { key: 'item3Quantity', label: 'Qty', type: 'number', row: 'item3' },
        { key: 'item3UnitPrice', label: 'Unit Price', type: 'currency', row: 'item3' },
        { key: 'item3LineTotal', label: 'Line Total', type: 'currency', row: 'item3' },

        { key: 'item4Description', label: 'Item 4 — Description', type: 'textarea' },
        { key: 'item4Quantity', label: 'Qty', type: 'number', row: 'item4' },
        { key: 'item4UnitPrice', label: 'Unit Price', type: 'currency', row: 'item4' },
        { key: 'item4LineTotal', label: 'Line Total', type: 'currency', row: 'item4' },

        { key: 'item5Description', label: 'Item 5 — Description', type: 'textarea' },
        { key: 'item5Quantity', label: 'Qty', type: 'number', row: 'item5' },
        { key: 'item5UnitPrice', label: 'Unit Price', type: 'currency', row: 'item5' },
        { key: 'item5LineTotal', label: 'Line Total', type: 'currency', row: 'item5' },
      ],
    },
    {
      key: 'totals',
      label: 'Totals',
      fields: [
        {
          key: 'subtotal',
          label: 'Subtotal',
          type: 'currency',
          autoCalculate: {
            type: 'sum',
            fields: [
              'item1LineTotal',
              'item2LineTotal',
              'item3LineTotal',
              'item4LineTotal',
              'item5LineTotal',
            ],
          },
        },
        { key: 'tax', label: 'Tax', type: 'currency' },
        {
          key: 'total',
          label: 'Total',
          type: 'currency',
          autoCalculate: { type: 'sum', fields: ['subtotal', 'tax'] },
        },
      ],
    },
  ],
};

(async () => {
  const passwordHash = await bcrypt.hash(LAURA_PASSWORD, 10);

  const masterUser = await prisma.user.findUnique({ where: { email: MASTER_EMAIL } });
  if (!masterUser) {
    throw new Error(`MASTER user ${MASTER_EMAIL} not found — run bootstrap-local-dev.js first`);
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
            description: 'Invoice form (NOA-265 follow-up)',
            isActive: true,
          },
        })
      : await tx.formDefinition.create({
          data: {
            name: FORM_NAME,
            documentTypeId: docType.id,
            schemaJson: SCHEMA,
            description: 'Invoice form (NOA-265 follow-up)',
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

    const existingCompany = await tx.companyProfile.findFirst({
      where: { companyName: LAURA_COMPANY_NAME },
    });
    const company = existingCompany
      ? await tx.companyProfile.update({
          where: { id: existingCompany.id },
          data: { planName: 'LAUNCH', monthlyDocLimit: 15 },
        })
      : await tx.companyProfile.create({
          data: {
            companyName: LAURA_COMPANY_NAME,
            planName: 'LAUNCH',
            monthlyDocLimit: 15,
          },
        });

    // Laura is a regular USER, not MASTER. She was previously created as
    // MASTER with parentCompanyProfileId=null which made her a ROOT master
    // (passed assertRootMaster) — full platform privileges by accident.
    // Fixed: role USER scopes her properly to her own tenant.
    const laura = await tx.user.upsert({
      where: { email: LAURA_EMAIL },
      update: {
        companyProfileId: company.id,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        firstName: 'Laura',
        lastName: 'Bravo',
        passwordHash,
      },
      create: {
        email: LAURA_EMAIL,
        companyProfileId: company.id,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        firstName: 'Laura',
        lastName: 'Bravo',
        passwordHash,
      },
    });

    const config = await tx.userDocumentConfig.upsert({
      where: {
        userId_documentTypeId_formDefinitionId_signatureTemplateId: {
          userId: masterUser.id,
          documentTypeId: docType.id,
          formDefinitionId: form.id,
          signatureTemplateId: sigTemplate.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: masterUser.id,
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
      company,
      laura,
      config,
      formCreated: !existingForm,
      sigCreated: !existingSig,
      companyCreated: !existingCompany,
    };
  });

  console.log('=== INVOICE TEST SETUP COMPLETE ===\n');
  console.log(`DocumentType ${result.docType.code}        ${result.docType.id}  ${result.docType.name}`);
  console.log(
    `FormDefinition (${result.formCreated ? 'CREATED' : 'UPDATED'})   ${result.form.id}  ${result.form.name}`,
  );
  console.log(
    `SignatureTemplate (${result.sigCreated ? 'CREATED' : 'UPDATED'})  ${result.sigTemplate.id}  active=${result.sigTemplate.isActive}  providerId=${result.sigTemplate.providerTemplateId}`,
  );
  console.log(
    `CompanyProfile (${result.companyCreated ? 'CREATED' : 'UPDATED'})  ${result.company.id}  ${result.company.companyName}  plan=${result.company.planName}/${result.company.monthlyDocLimit}docs`,
  );
  console.log(
    `User Laura                ${result.laura.id}  ${result.laura.email}  role=${result.laura.role}`,
  );
  console.log(
    `MASTER UserDocumentConfig ${result.config.id}  active=${result.config.isActive}  (master ${masterUser.id})`,
  );

  console.log('\n=== Cleanup SQL (only the INVOICE entities created here) ===');
  console.log(`DELETE FROM user_document_configs WHERE id = '${result.config.id}';`);
  console.log(`DELETE FROM signature_templates WHERE id = '${result.sigTemplate.id}';`);
  console.log(`DELETE FROM form_definitions WHERE id = '${result.form.id}';`);
  console.log(`DELETE FROM document_types WHERE code = '${DOC_TYPE_CODE}';`);
  console.log('-- Laura + her company NOT included; clean separately if needed:');
  console.log(`-- DELETE FROM users WHERE email = '${LAURA_EMAIL}';`);
  console.log(`-- DELETE FROM company_profiles WHERE id = '${result.company.id}';`);

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('FAILED:', e.message);
  if (e.stack) console.error(e.stack);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
