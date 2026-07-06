/**
 * Idempotent, non-destructive staging seed: 3 test users + signature template +
 * UserDocumentConfig + sample customers (PERSONAL + BUSINESS) for the e2e test.
 *
 * PREREQ: CONSTRUCTION_CONTRACT DocumentType + its FormDefinition must exist —
 * run `node prisma/seed.js` first (the deploy step does). This script reuses
 * them (it never creates/overwrites the form schema).
 *
 * Run on the staging VM (env has the staging DATABASE_URL):
 *   cd ~/apps/ntssign/apps/backend && node prisma/seed.js \
 *     && node scripts/dev-helpers/_seed-staging-test-users.js
 *
 * Idempotent: upserts by stable id/email, skips customers whose email exists.
 * Passwords overridable via env (STAGING_*_PASSWORD).
 */
const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const COMPANY_ID = '7aaad16a-6d76-4c36-97c7-b9ce3e45b801'; // World Pavers
// SignatureTemplate id MUST be a UUID — the create-draft DTO validates
// signatureTemplateId with @IsUUID(), so a literal string id caused a 400.
const TEMPLATE_ID = 'b8f0e01b-c3cb-4c02-b1d3-566d6053a78c';
const OLD_LITERAL_TEMPLATE_ID = 'staging-test-construction-template';
const PROVIDER_TEMPLATE_ID =
  process.env.STAGING_PROVIDER_TEMPLATE_ID ||
  'cb255e39-9f97-44cb-a8c1-4c841f94b3bc'; // real World Pavers BoldSign template

const USERS = [
  {
    key: 'MASTER',
    email: 'master@staging.ntssign.com',
    password: 'MasterStg2026!',
    role: 'SUPERADMIN',
    firstName: 'Staging',
    lastName: 'Master',
  },
  {
    key: 'PERSONAL',
    email: 'personal@staging.ntssign.com',
    password: 'PersonalStg2026!',
    role: 'USER',
    firstName: 'Personal',
    lastName: 'Tester',
  },
  {
    key: 'BUSINESS',
    email: 'business@staging.ntssign.com',
    password: 'BusinessStg2026!',
    role: 'USER',
    firstName: 'Business',
    lastName: 'Tester',
  },
];

const PERSONAL_CUSTOMERS = [
  { fullName: 'Robert Johnson', email: 'robert.johnson@example.com', phone: '(305) 555-1234', addressLine1: '456 Oak Ave', city: 'Houston', state: 'TX', zipCode: '77002', country: 'USA' },
  { fullName: 'Maria Garcia', email: 'maria.garcia@example.com', phone: '(713) 555-5678', addressLine1: '789 Pine St', city: 'Austin', state: 'TX', zipCode: '73301', country: 'USA' },
  { fullName: 'James Wilson', email: 'james.wilson@example.com', phone: '(210) 555-9090', addressLine1: '12 Cedar Ln', city: 'Dallas', state: 'TX', zipCode: '75201', country: 'USA' },
];

const BUSINESS_CUSTOMERS = [
  {
    customer: { fullName: 'Garcia Construction LLC', email: 'carlos@garciaconstruction.com', phone: '(512) 555-9012', addressLine1: '321 Business Blvd', city: 'Dallas', state: 'TX', zipCode: '75201', country: 'USA' },
    business: { businessName: 'Garcia Construction LLC', businessEmail: 'info@garciaconstruction.com', businessPhone: '(512) 555-9012', businessAddressLine1: '321 Business Blvd', businessCity: 'Dallas', businessState: 'TX', businessZipCode: '75201', primaryContactName: 'Carlos Garcia', primaryContactEmail: 'carlos@garciaconstruction.com', primaryContactPhone: '(512) 555-1111', primaryContactTitle: 'Owner', primaryContactAddressLine1: '321 Business Blvd', primaryContactCity: 'Dallas', primaryContactState: 'TX', primaryContactZipCode: '75201' },
  },
  {
    customer: { fullName: 'Smith & Associates', email: 'sarah@smithassociates.com', phone: '(214) 555-3456', addressLine1: '987 Market St', city: 'Houston', state: 'TX', zipCode: '77003', country: 'USA' },
    business: { businessName: 'Smith & Associates', businessEmail: 'contact@smithassociates.com', businessPhone: '(214) 555-3456', businessAddressLine1: '987 Market St', businessCity: 'Houston', businessState: 'TX', businessZipCode: '77003', primaryContactName: 'Sarah Smith', primaryContactEmail: 'sarah@smithassociates.com', primaryContactPhone: '(214) 555-2222', primaryContactTitle: 'Managing Partner', primaryContactAddressLine1: '987 Market St', primaryContactCity: 'Houston', primaryContactState: 'TX', primaryContactZipCode: '77003' },
  },
];

async function main() {
  // 1. Company (World Pavers) — upsert.
  const company = await prisma.companyProfile.upsert({
    where: { id: COMPANY_ID },
    update: {},
    create: {
      id: COMPANY_ID,
      companyName: 'World Pavers Company',
      legalName: 'World Pavers Company',
      industry: 'Construction company',
      email: 'noatechsolutions@gmail.com',
      phone: '(510) 883-4283',
      addressLine1: '371 Laure Ave Apt 7',
      city: 'Hayward',
      state: 'CA',
      zipCode: '94541',
      country: 'USA',
      licenseNumber: '#1136332',
      contactFirstName: 'Miguel Angel',
      contactLastName: 'Hernandez',
      contactTitle: 'Company Representative',
      contactEmail: 'noatechsolutions@gmail.com',
      contactPhone: '(510) 883-4283',
    },
  });

  // 2. DocumentType + FormDefinition — must already exist (from `node prisma/seed.js`).
  const docType = await prisma.documentType.findUnique({
    where: { code: 'CONSTRUCTION_CONTRACT' },
  });
  if (!docType) {
    throw new Error(
      'CONSTRUCTION_CONTRACT DocumentType not found. Run `node prisma/seed.js` first.',
    );
  }
  const form = await prisma.formDefinition.findFirst({
    where: { documentTypeId: docType.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!form) {
    throw new Error('No active FormDefinition for CONSTRUCTION_CONTRACT.');
  }

  // 3. Migrate away from the old non-UUID template id (caused 400s): drop its
  //    configs + the template itself. No documents reference it (creation was
  //    blocked), so this is safe. Idempotent: no-op once it's gone.
  const oldTemplate = await prisma.signatureTemplate.findUnique({
    where: { id: OLD_LITERAL_TEMPLATE_ID },
  });
  if (oldTemplate) {
    await prisma.userDocumentConfig.deleteMany({
      where: { signatureTemplateId: OLD_LITERAL_TEMPLATE_ID },
    });
    await prisma.signatureTemplate.delete({ where: { id: OLD_LITERAL_TEMPLATE_ID } });
    console.log(`Removed old non-UUID template ${OLD_LITERAL_TEMPLATE_ID}`);
  }

  // SignatureTemplate (real World Pavers BoldSign template) — upsert by UUID id.
  const template = await prisma.signatureTemplate.upsert({
    where: { id: TEMPLATE_ID },
    update: {
      documentTypeId: docType.id,
      providerTemplateId: PROVIDER_TEMPLATE_ID,
      isActive: true,
    },
    create: {
      id: TEMPLATE_ID,
      name: 'World Pavers Contract Template (staging)',
      documentTypeId: docType.id,
      providerTemplateId: PROVIDER_TEMPLATE_ID,
      recipientRole: 'Client',
      isActive: true,
    },
  });

  // 4. Users (bcrypt 10) — upsert by email. Password set on create AND update so
  //    the reported credentials always work.
  const users = {};
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    users[u.key] = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        companyProfileId: company.id,
        role: UserRole[u.role],
        status: UserStatus.ACTIVE,
        firstName: u.firstName,
        lastName: u.lastName,
      },
      create: {
        email: u.email,
        passwordHash,
        companyProfileId: company.id,
        role: UserRole[u.role],
        status: UserStatus.ACTIVE,
        firstName: u.firstName,
        lastName: u.lastName,
      },
    });
  }

  // 5. UserDocumentConfig for the 2 USER accounts.
  for (const key of ['PERSONAL', 'BUSINESS']) {
    await prisma.userDocumentConfig.upsert({
      where: {
        userId_documentTypeId_formDefinitionId_signatureTemplateId: {
          userId: users[key].id,
          documentTypeId: docType.id,
          formDefinitionId: form.id,
          signatureTemplateId: template.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: users[key].id,
        documentTypeId: docType.id,
        formDefinitionId: form.id,
        signatureTemplateId: template.id,
        isActive: true,
      },
    });
  }

  // 6. Customers — PERSONAL (owned by personal user) + BUSINESS (business user).
  //    Idempotent: skip if email already exists for the tenant.
  const owner = users.PERSONAL;
  const bizOwner = users.BUSINESS;
  let custCreated = 0;
  let custSkipped = 0;

  for (const c of PERSONAL_CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { email: c.email, companyProfileId: company.id },
    });
    if (existing) { custSkipped++; continue; }
    await prisma.customer.create({
      data: { ...c, customerType: 'PERSONAL', userId: owner.id, companyProfileId: company.id, createdByUserId: owner.id },
    });
    custCreated++;
  }

  for (const { customer: c, business: b } of BUSINESS_CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { email: c.email, companyProfileId: company.id },
    });
    if (existing) { custSkipped++; continue; }
    await prisma.customer.create({
      data: {
        ...c,
        customerType: 'BUSINESS',
        userId: bizOwner.id,
        companyProfileId: company.id,
        createdByUserId: bizOwner.id,
        business: { create: b },
      },
    });
    custCreated++;
  }

  // Single-superadmin cleanup: master@staging.ntssign.com is the only MASTER.
  // Demote the stray .test master so there is exactly one superadmin on staging.
  const demoted = await prisma.user.updateMany({
    where: { email: 'master@ntssign.test', role: 'SUPERADMIN' },
    data: { role: 'USER' },
  });
  console.log(`Demoted stray masters (master@ntssign.test): ${demoted.count}`);

  console.log('=== STAGING SEED DONE ===');
  console.log(`Company: ${company.companyName} (${company.id})`);
  console.log(`DocumentType: ${docType.code} | FormDefinition: ${form.id}`);
  console.log(`SignatureTemplate: ${template.id} -> provider ${PROVIDER_TEMPLATE_ID}`);
  for (const u of USERS) {
    console.log(`User ${u.role}: ${u.email} (id ${users[u.key].id})`);
  }
  console.log(`Customers: created ${custCreated}, skipped ${custSkipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('STAGING_SEED_ERROR:', e.message);
  prisma.$disconnect().finally(() => process.exit(1));
});
