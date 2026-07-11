/**
 * LOCAL dev-helper (untracked): end-to-end setup for the Laura invoice flow.
 *   node scripts/dev-helpers/_setup-laura-test.js
 *
 * Idempotent. Creates/repairs everything needed to create an invoice via the new
 * DIRECT_PDF pipeline as the test user `laura.test`:
 *   1. DocumentType INVOICE  -> generationMode DIRECT_PDF  (kills the shadow BoldSign)
 *   2. ReceiptTemplateStandard invoice-standard-v1 -> renderMode acroform-overlay +
 *      the owner-approved fieldMappingJson (mirrors seed-template-catalog.js)
 *   3. FormDefinition (schemaJson) -> the 2-tab invoice wizard schema
 *   4. Tenant (CompanyProfile) + user laura.test (INDIVIDUAL / USER / ACTIVE)
 *   5. Makes the standard PRIVATE to laura.test's tenant (visibility filter)
 *   6. Activates it for the tenant (per-tenant ReceiptTemplate instance + default)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const TENANT_ID = 'c1a11111-0000-4000-8000-000000000001';
const LOGIN = { email: 'laura.test@ntssign.test', password: 'secret123' };
const SLUG = 'invoice-standard-v1';

// Owner-approved calibration for INVOCE_LauraBravo.pdf. Mirrors the INVOICE_STANDARDS
// block in scripts/seed-template-catalog.js (kept in sync by hand — dev helper).
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

// The schema-driven wizard form (DocumentSchema shape — sections = tabs).
const INVOICE_SCHEMA = {
  sections: [
    {
      key: 'billed_to',
      label: 'Billed to',
      toggles: [{ key: 'business', label: 'Business customer', defaultValue: false }],
      fields: [
        { key: 'first_name', label: 'First name', type: 'text', required: true, transform: 'titleCase', hideWhen: 'business', row: 'name' },
        { key: 'middle_name', label: 'Middle name', type: 'text', transform: 'titleCase', hideWhen: 'business', row: 'name' },
        { key: 'last_name', label: 'Last name', type: 'text', required: true, transform: 'titleCase', hideWhen: 'business', row: 'name' },
        { key: 'company_name', label: 'Company name', type: 'text', required: true, showWhen: 'business' },
        { key: 'street', label: 'Street address', type: 'text', required: true },
        { key: 'city', label: 'City', type: 'text', required: true, row: 'csz' },
        { key: 'state', label: 'State', type: 'text', required: true, row: 'csz' },
        { key: 'zip', label: 'Zip code', type: 'text', required: true, row: 'csz' },
        // Recipient email — optional for a draft; required + format-checked only on
        // "Create and send" (validated by the wizard's sendRequiredFields).
        { key: 'recipient_email', label: 'Recipient email', type: 'email', validation: { isEmail: true }, placeholder: 'name@example.com' },
      ],
    },
    {
      key: 'service',
      label: 'Service',
      fields: [
        // titleCase: same auto-capitalization as first_name. NOT on event_location
        // (it holds "City, ST" and titleCase would lowercase the state, e.g. FL->Fl).
        { key: 'service_type', label: 'Service', type: 'text', required: true, transform: 'titleCase', placeholder: 'e.g. Acoustic Performance' },
        { key: 'event_date', label: 'Event date', type: 'date', required: true },
        { key: 'event_name', label: 'Event name', type: 'text', required: true, transform: 'titleCase' },
        { key: 'event_location', label: 'Event location', type: 'text', required: true, placeholder: 'e.g. Miami, FL' },
      ],
    },
    {
      key: 'pricing',
      label: 'Pricing',
      fields: [
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, transform: 'digitsOnly', validation: { min: 1 }, row: 'qp' },
        { key: 'price', label: 'Price', type: 'currency', required: true, row: 'qp' },
        { key: 'total', label: 'Total', type: 'currency', autoCalculate: { type: 'multiply', fields: ['quantity', 'price'] } },
        { key: 'subtotal', label: 'Subtotal', type: 'currency', autoCalculate: { type: 'copy', source: 'total' } },
        { key: 'gran_total', label: 'Grand total', type: 'currency', autoCalculate: { type: 'copy', source: 'subtotal' } },
      ],
    },
  ],
};

(async () => {
  try {
    // 1) INVOICE DocumentType — DIRECT_PDF (kills the shadow BoldSign default).
    const docType = await prisma.documentType.upsert({
      where: { code: 'INVOICE' },
      update: { name: 'Invoice', generationMode: 'DIRECT_PDF' },
      create: { code: 'INVOICE', name: 'Invoice', generationMode: 'DIRECT_PDF' },
    });
    console.log(`DocumentType INVOICE -> ${docType.id} mode=${docType.generationMode}`);

    // 2) Standard (catalog) — overlay engine + approved mapping, category INVOICE.
    const standardData = {
      name: 'Invoice (standard)',
      description: 'Single line-item invoice, rendered by the AcroForm overlay engine.',
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
    };
    const standard = await prisma.receiptTemplateStandard.upsert({
      where: { slug: SLUG },
      update: standardData,
      create: { slug: SLUG, ...standardData },
    });
    console.log(`Standard ${SLUG} -> ${standard.id} mode=${standard.renderMode}`);

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
            description: 'Laura Bravo invoice — Billed to + Service.',
            schemaJson: INVOICE_SCHEMA,
            isActive: true,
          },
        });
    console.log(`FormDefinition -> ${form.id}`);

    // 4) Tenant + user laura.test.
    const company = await prisma.companyProfile.upsert({
      where: { id: TENANT_ID },
      update: { companyName: 'Laura Test', receiptsUnlimited: true, monthlyReceiptLimit: 999, contractsEnabled: false },
      create: {
        id: TENANT_ID,
        companyName: 'Laura Test',
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
      update: { companyProfileId: company.id, passwordHash, role: 'USER', status: 'ACTIVE', accountType: 'INDIVIDUAL', firstName: 'Laura', lastName: 'Test' },
      create: { email: LOGIN.email, companyProfileId: company.id, passwordHash, role: 'USER', status: 'ACTIVE', accountType: 'INDIVIDUAL', firstName: 'Laura', lastName: 'Test' },
    });
    console.log(`User ${user.email} -> ${user.id} (tenant ${company.id})`);

    // 5) Make the standard PRIVATE to this tenant (visibility filter).
    await prisma.receiptTemplateStandard.update({
      where: { id: standard.id },
      data: { ownerCompanyProfileId: company.id },
    });
    console.log(`Standard ${SLUG} now PRIVATE to ${company.id}`);

    // 6) Activate for the tenant: provision-or-update the instance + set default.
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
    console.log(`Activated invoice template instance ${instance.id} for tenant`);

    console.log('\n✅ laura.test ready. Login:', LOGIN.email, '/', LOGIN.password);
    await prisma.$disconnect();
  } catch (e) {
    console.error('SETUP_ERROR:', e && e.stack ? e.stack : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
