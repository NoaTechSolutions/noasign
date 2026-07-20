/**
 * Idempotent, non-destructive STAGING seed: Laura — the individual, no-contracts
 * (contractsEnabled=false) test tenant with her PRIVATE events-invoice template, so
 * the owner can validate the DIRECT_PDF invoice flow on staging with her own PDF.
 *
 * Mirror of the LOCAL dev-helper scripts/dev-helpers/_setup-laura-test.js, with ONE
 * deliberate difference for staging safety: instead of privatizing the SHARED
 * catalog standard `invoice-standard-v1` (which would hide it from every other
 * tenant), Laura gets a DEDICATED private standard `invoice-laura-events-v1` with the
 * SAME base PDF + field mapping + wizard schema. The shared catalog is untouched.
 *
 * Provisions (all upserts — safe to re-run):
 *   1. DocumentType INVOICE -> generationMode DIRECT_PDF (idempotent; kills any shadow BoldSign)
 *   2. A PRIVATE ReceiptTemplateStandard (invoice-laura-events-v1) owned by Laura's tenant
 *   3. FormDefinition (the 3-tab invoice wizard schema) for the INVOICE type
 *   4. Tenant (CompanyProfile) + user laura@staging.ntssign.com (INDIVIDUAL / USER / ACTIVE, contractsEnabled=false)
 *   5. Per-tenant ReceiptTemplate instance + companyTemplate default (so create resolves it)
 *
 * DATABASE_URL is exported by the deploy workflow; the backend must be built first
 * (not required here — no dist import — but kept consistent with the other seeds).
 * Password override via env STAGING_LAURA_PASSWORD.
 */
const { PrismaClient, UserRole, UserStatus, AccountType } = require('@prisma/client');
const bcrypt = require('bcrypt');

const TENANT_ID = '5ad11000-0000-4000-8000-000000000004';
const LOGIN = {
  email: 'laura@staging.ntssign.com',
  password: process.env.STAGING_LAURA_PASSWORD || 'LauraStg2026!',
};
const SLUG = 'invoice-laura-events-v1';

// Owner-approved calibration for INVOCE_LauraBravo.pdf (same as the local helper).
const INVOICE_MAPPING = {
  billed_to: { type: 'text', size: 14, color: '#000000', multiline: true },
  number: { type: 'text', size: 14, color: '#000000', baselineNudge: 4 },
  date: { type: 'text', size: 14, color: '#000000' },
  service: { type: 'text', size: 13, color: '#000000', multiline: true },
  quantity: { type: 'text', size: 13, color: '#000000' },
  price: { type: 'text', size: 13, color: '#000000', padX: -1 },
  total: { type: 'text', size: 13, color: '#000000', padX: 2 },
  subtotal: { type: 'text', size: 14, color: '#000000', padX: 2, baselineNudge: 4 },
  gran_total: { type: 'text', size: 17, color: '#000000', padX: 2, baselineNudge: 4 },
};

// The schema-driven wizard form (sections = tabs). Same as the local helper.
const INVOICE_SCHEMA = {
  sections: [
    {
      key: 'billed_to',
      label: 'Billed to',
      toggles: [
        { key: 'business', label: 'Business customer', defaultValue: false },
        { key: 'different_day', label: 'Different day', defaultValue: false },
      ],
      fields: [
        { key: 'issueDate', label: 'Issue date', type: 'date', defaultValue: 'today', showWhen: 'different_day', validation: { minDate: 'yearStart' } },
        { key: 'first_name', label: 'First name', type: 'text', required: true, transform: 'titleCase', hideWhen: 'business', row: 'name' },
        { key: 'middle_name', label: 'Middle name', type: 'text', transform: 'titleCase', hideWhen: 'business', row: 'name' },
        { key: 'last_name', label: 'Last name', type: 'text', required: true, transform: 'titleCase', hideWhen: 'business', row: 'name' },
        { key: 'company_name', label: 'Company name', type: 'text', required: true, showWhen: 'business' },
        { key: 'recipient_email', label: 'Recipient email', type: 'email', validation: { isEmail: true }, placeholder: 'name@example.com' },
        { key: 'street', label: 'Street address', type: 'text', required: true },
        { key: 'city', label: 'City', type: 'text', required: true, row: 'csz' },
        { key: 'state', label: 'State', type: 'text', required: true, row: 'csz' },
        { key: 'zip', label: 'Zip code', type: 'text', required: true, row: 'csz' },
      ],
    },
    {
      key: 'service',
      label: 'Service',
      fields: [
        { key: 'service_type', label: 'Service', type: 'text', required: true, transform: 'titleCase', placeholder: 'e.g. Acoustic Performance', row: 'svc_1' },
        { key: 'event_date', label: 'Event date', type: 'date', required: true, row: 'svc_1' },
        { key: 'event_name', label: 'Event name', type: 'text', required: true, transform: 'titleCase', row: 'svc_2' },
        { key: 'event_location', label: 'Event location', type: 'text', required: true, transform: 'capitalizeFirst', placeholder: 'e.g. Miami, FL', row: 'svc_2' },
      ],
    },
    {
      key: 'pricing',
      label: 'Pricing',
      fields: [
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, transform: 'digitsOnly', validation: { min: 1 }, row: 'qp' },
        { key: 'price', label: 'Price', type: 'currency', required: true, row: 'qp' },
        { key: 'total', label: 'Total', type: 'currency', autoCalculate: { type: 'multiply', fields: ['quantity', 'price'] }, row: 'money' },
        { key: 'subtotal', label: 'Subtotal', type: 'currency', autoCalculate: { type: 'copy', source: 'total' }, row: 'money' },
        { key: 'gran_total', label: 'Grand total', type: 'currency', autoCalculate: { type: 'copy', source: 'subtotal' }, row: 'money' },
      ],
    },
  ],
};

async function main() {
  const prisma = new PrismaClient();
  try {
    // 1) INVOICE DocumentType — DIRECT_PDF (idempotent).
    const docType = await prisma.documentType.upsert({
      where: { code: 'INVOICE' },
      update: { name: 'Invoice', generationMode: 'DIRECT_PDF' },
      create: { code: 'INVOICE', name: 'Invoice', generationMode: 'DIRECT_PDF' },
    });

    // 4) Tenant + user (create the tenant BEFORE privatizing the standard to it).
    const company = await prisma.companyProfile.upsert({
      where: { id: TENANT_ID },
      update: {
        companyName: 'Laura Bravo',
        email: LOGIN.email,
        contactEmail: LOGIN.email,
        receiptsUnlimited: true,
        monthlyReceiptLimit: 999,
        contractsEnabled: false,
      },
      create: {
        id: TENANT_ID,
        companyName: 'Laura Bravo',
        email: LOGIN.email,
        contactEmail: LOGIN.email,
        planName: 'LAUNCH',
        receiptsUnlimited: true,
        monthlyReceiptLimit: 999,
        contractsEnabled: false,
      },
    });

    const passwordHash = await bcrypt.hash(LOGIN.password, 10);
    const user = await prisma.user.upsert({
      where: { email: LOGIN.email },
      update: {
        companyProfileId: company.id,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        accountType: AccountType.INDIVIDUAL,
        firstName: 'Laura',
        lastName: 'Bravo',
      },
      create: {
        email: LOGIN.email,
        companyProfileId: company.id,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        accountType: AccountType.INDIVIDUAL,
        firstName: 'Laura',
        lastName: 'Bravo',
      },
    });

    // 2) A DEDICATED standard, PRIVATE to Laura's tenant — the shared catalog
    //    (invoice-standard-v1) is intentionally left untouched.
    const standardData = {
      name: 'Invoice — Laura (events)',
      description: 'Laura Bravo private events invoice, rendered by the AcroForm overlay engine.',
      basePdfPath: 'assets/templates/INVOCE_LauraBravo.pdf',
      pageWidth: 595.2,
      pageHeight: 841.9,
      mediaBoxOffsetY: 0,
      numberFormat: 'INV-{YYYY}-{NNNN}',
      renderMode: 'acroform-overlay',
      isActive: true,
      isDefault: true,
      category: 'INVOICE',
      documentTypeId: docType.id,
      fieldMappingJson: INVOICE_MAPPING,
      ownerCompanyProfileId: company.id, // PRIVATE to Laura
    };
    const standard = await prisma.receiptTemplateStandard.upsert({
      where: { slug: SLUG },
      update: standardData,
      create: { slug: SLUG, ...standardData },
    });

    // 3) FormDefinition (schemaJson) for the INVOICE type.
    const existingForm = await prisma.formDefinition.findFirst({
      where: { documentTypeId: docType.id, name: 'Invoice (Laura)' },
    });
    const form = existingForm
      ? await prisma.formDefinition.update({
          where: { id: existingForm.id },
          data: { schemaJson: INVOICE_SCHEMA, isActive: true },
        })
      : await prisma.formDefinition.create({
          data: {
            name: 'Invoice (Laura)',
            documentTypeId: docType.id,
            description: 'Laura Bravo invoice — Billed to / Service / Pricing.',
            schemaJson: INVOICE_SCHEMA,
            isActive: true,
          },
        });

    // 5) Activate for the tenant: provision-or-update the instance + set default.
    const instanceData = {
      name: standard.name,
      basePdfPath: standard.basePdfPath,
      pageWidth: standard.pageWidth,
      pageHeight: standard.pageHeight,
      mediaBoxOffsetY: standard.mediaBoxOffsetY,
      fieldMappingJson: INVOICE_MAPPING,
      numberFormat: standard.numberFormat,
      category: 'INVOICE',
      documentTypeId: docType.id,
      standardId: standard.id,
      isActive: true,
    };
    const existingInstance = await prisma.receiptTemplate.findFirst({
      where: { companyProfileId: company.id, standardId: standard.id },
    });
    const instance = existingInstance
      ? await prisma.receiptTemplate.update({ where: { id: existingInstance.id }, data: instanceData })
      : await prisma.receiptTemplate.create({ data: { companyProfileId: company.id, ...instanceData } });

    await prisma.companyTemplate.updateMany({
      where: { companyProfileId: company.id, category: 'INVOICE', isDefault: true },
      data: { isDefault: false },
    });
    const existingCT = await prisma.companyTemplate.findFirst({
      where: { companyProfileId: company.id, category: 'INVOICE', receiptTemplateId: instance.id },
    });
    if (existingCT) {
      await prisma.companyTemplate.update({ where: { id: existingCT.id }, data: { isDefault: true, isActive: true } });
    } else {
      await prisma.companyTemplate.create({
        data: { companyProfileId: company.id, category: 'INVOICE', receiptTemplateId: instance.id, isDefault: true, isActive: true },
      });
    }

    console.log('=== STAGING LAURA SEED DONE ===');
    console.log(
      JSON.stringify(
        {
          company: 'Laura Bravo',
          companyId: company.id,
          userId: user.id,
          contractsEnabled: false,
          accountType: 'INDIVIDUAL',
          template: { slug: SLUG, standardId: standard.id, instanceId: instance.id, private: true },
          formDefinitionId: form.id,
          documentTypeId: docType.id,
          login: { email: LOGIN.email, password: LOGIN.password, role: 'USER' },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('STAGING_LAURA_SEED_ERROR:', e && e.stack ? e.stack : e);
  process.exit(1);
});
