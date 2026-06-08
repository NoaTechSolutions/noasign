const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Canonical construction-contract schema. Kept in sync with the version in
// prisma/seed.ts — when one changes, update both. Used by the FormDefinition
// upsert below so Ana's drawer renders a real form (otherwise schemaJson
// stays null and the drawer shows "No form schema configured").
const constructionSchema = {
  sections: [
    {
      key: 'client',
      label: 'Client',
      fields: [
        { key: 'customer_name', label: 'Customer name', type: 'text', required: true, placeholder: 'Full name', transform: 'titleCase', row: 'name-age' },
        { key: 'customer_age', label: 'Age', type: 'number', required: true, placeholder: '35', transform: 'digitsOnly', validation: { min: 21, maxLength: 3 }, row: 'name-age' },
        { key: 'customer_email', label: 'Email', type: 'email', required: true, placeholder: 'Email address', validation: { isEmail: true } },
        { key: 'customer_phone', label: 'Phone', type: 'phone', placeholder: '(555) 123-4567', transform: 'phone', row: 'phone-fax' },
        { key: 'customer_fax', label: 'Fax', type: 'phone', placeholder: '(555) 123-4567', transform: 'phone', row: 'phone-fax' },
        { key: 'customer_address', label: 'Address', type: 'text', placeholder: 'Street address' },
        { key: 'city', label: 'City', type: 'text', placeholder: 'City', row: 'csz' },
        { key: 'state', label: 'State', type: 'text', placeholder: 'State', row: 'csz' },
        { key: 'zip', label: 'Zip code', type: 'text', placeholder: 'Zip code', row: 'csz' },
      ],
    },
    {
      key: 'project',
      label: 'Project',
      copyAddressToggle: { label: 'Same as client address', defaultValue: true },
      fields: [
        { key: 'project_address', label: 'Project address', type: 'text', required: true, placeholder: 'Project address', copyFrom: 'customer_address' },
        { key: 'project_city', label: 'City', type: 'text', required: true, placeholder: 'City', copyFrom: 'city', row: 'pcsz' },
        { key: 'project_state', label: 'State', type: 'text', required: true, placeholder: 'State', copyFrom: 'state', row: 'pcsz' },
        { key: 'project_zip', label: 'Zip code', type: 'text', required: true, placeholder: 'Zip code', copyFrom: 'zip', row: 'pcsz' },
        { key: 'start_date', label: 'Start date', type: 'date', required: true, validation: { minDate: 'today' }, row: 'dates' },
        { key: 'estimated_completion_date', label: 'Est. completion date', type: 'date', validation: { minDateFrom: 'start_date' }, row: 'dates' },
        { key: 'project_description', label: 'Project description', type: 'textarea', placeholder: 'Project description' },
        { key: 'contract_scope', label: 'Internal notes (only you can see this)', type: 'text', placeholder: 'Add internal notes' },
      ],
    },
    {
      key: 'pricing',
      label: 'Pricing',
      toggles: [{ key: 'finance', label: 'Finance' }],
      fields: [
        { key: 'contract_amount', label: 'Contract price', type: 'currency', required: true, placeholder: '12000.00', transform: 'currency', row: 'main-amounts' },
        { key: 'down_payment_amount', label: 'Down payment', type: 'currency', placeholder: '2500.00', transform: 'currency', row: 'main-amounts' },
        { key: 'finance_charge', label: 'Finance charge', type: 'currency', placeholder: '350.00', transform: 'currency', showWhen: 'finance' },
        { key: 'finance_1_amount', label: 'Finance 1', type: 'currency', placeholder: '1000.00', transform: 'currency', showWhen: 'finance', row: 'fin1' },
        { key: 'finance_1_description', label: 'Description', type: 'text', placeholder: 'Description', showWhen: 'finance', row: 'fin1' },
        { key: 'finance_1_date', label: 'Date', type: 'date', showWhen: 'finance', row: 'fin1' },
        { key: 'finance_2_amount', label: 'Finance 2', type: 'currency', placeholder: '1000.00', transform: 'currency', showWhen: 'finance', row: 'fin2' },
        { key: 'finance_2_description', label: 'Description', type: 'text', placeholder: 'Description', showWhen: 'finance', row: 'fin2' },
        { key: 'finance_2_date', label: 'Date', type: 'date', showWhen: 'finance', row: 'fin2' },
        { key: 'finance_3_amount', label: 'Finance 3', type: 'currency', placeholder: '1000.00', transform: 'currency', showWhen: 'finance', row: 'fin3' },
        { key: 'finance_3_description', label: 'Description', type: 'text', placeholder: 'Description', showWhen: 'finance', row: 'fin3' },
        { key: 'finance_3_date', label: 'Date', type: 'date', showWhen: 'finance', row: 'fin3' },
        { key: 'finance_4_amount', label: 'Finance 4', type: 'currency', placeholder: '1000.00', transform: 'currency', showWhen: 'finance', row: 'fin4' },
        { key: 'finance_4_description', label: 'Description', type: 'text', placeholder: 'Description', showWhen: 'finance', row: 'fin4' },
        { key: 'finance_4_date', label: 'Date', type: 'date', showWhen: 'finance', row: 'fin4' },
        { key: 'payment_schedule', label: 'Payment schedule', type: 'text', placeholder: 'Payment schedule' },
      ],
    },
    {
      key: 'others',
      label: 'Others',
      fields: [
        { key: 'salesman_full_name', label: 'Salesman who solicited or negotiated contract', type: 'text', placeholder: 'Full name' },
        { key: 'state_registration_number', label: 'State registration number', type: 'text', placeholder: 'Registration number' },
        { key: 'warranty_years', label: 'Warranty year(s)', type: 'number', placeholder: '10', transform: 'digitsOnly', validation: { maxLength: 3 } },
      ],
    },
  ],
};

async function main() {
  const companyProfileId =
    process.env.LOCAL_COMPANY_PROFILE_ID ||
    '7aaad16a-6d76-4c36-97c7-b9ce3e45b801';
  const masterEmail =
    process.env.LOCAL_MASTER_EMAIL || 'master@ntssign.test';
  const legacyUserEmail = 'user@ntssign.test';
  const userEmail =
    process.env.LOCAL_USER_EMAIL || 'ana.martinez@worldpaversco.test';
  const defaultPassword =
    process.env.LOCAL_USER_PASSWORD || 'secret123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const providerTemplateId =
    process.env.LOCAL_SIGNATURE_TEMPLATE_ID || 'DhBwzpbNdESYiCnPmjDLT9';
  const recipientRole =
    process.env.LOCAL_SIGNATURE_RECIPIENT_ROLE || 'BUYER';
  const templateName =
    process.env.LOCAL_SIGNATURE_TEMPLATE_NAME ||
    'NTSsign BoldSign Contract Template';
  const logoUrl = buildWorldPaversLogoDataUrl();

  const companyProfile = await prisma.companyProfile.upsert({
    where: { id: companyProfileId },
    update: {
      companyName: 'World Pavers Company',
      legalName: 'World Pavers Company',
      industry: 'Construction company',
      email: 'noatechsolutions@gmail.com',
      phone: '(510) 883-4283',
      phone2: '',
      website: '',
      addressLine1: '371 Laure Ave Apt 7',
      addressLine2: '',
      city: 'Hayward',
      state: 'CA',
      zipCode: '94541',
      country: 'USA',
      logoUrl,
      licenseNumber: '#1136332',
      contactFirstName: 'Miguel Angel',
      contactLastName: 'Hernandez',
      contactTitle: 'Company Representative',
      contactEmail: 'noatechsolutions@gmail.com',
      contactPhone: '(510) 883-4283',
    },
    create: {
      id: companyProfileId,
      companyName: 'World Pavers Company',
      legalName: 'World Pavers Company',
      industry: 'Construction company',
      email: 'noatechsolutions@gmail.com',
      phone: '(510) 883-4283',
      phone2: '',
      website: '',
      addressLine1: '371 Laure Ave Apt 7',
      addressLine2: '',
      city: 'Hayward',
      state: 'CA',
      zipCode: '94541',
      country: 'USA',
      logoUrl,
      licenseNumber: '#1136332',
      contactFirstName: 'Miguel Angel',
      contactLastName: 'Hernandez',
      contactTitle: 'Company Representative',
      contactEmail: 'noatechsolutions@gmail.com',
      contactPhone: '(510) 883-4283',
    },
  });

  const contractType = await prisma.documentType.upsert({
    where: { code: 'CON' },
    update: {
      name: 'Contract',
    },
    create: {
      name: 'Contract',
      code: 'CON',
    },
  });

  const formDefinition = await prisma.formDefinition.upsert({
    where: { id: '55bf672d-f307-46df-abe7-f2f7b9ca653c' },
    update: {
      name: 'Construction Contract Form A',
      description: 'Base form for construction contracts',
      isActive: true,
      documentTypeId: contractType.id,
      schemaJson: constructionSchema,
    },
    create: {
      id: '55bf672d-f307-46df-abe7-f2f7b9ca653c',
      name: 'Construction Contract Form A',
      description: 'Base form for construction contracts',
      isActive: true,
      documentTypeId: contractType.id,
      schemaJson: constructionSchema,
    },
  });

  const signatureTemplate = await prisma.signatureTemplate.upsert({
    where: { id: '2b549fa1-82a5-41b2-87ad-45796a3626f6' },
    update: {
      name: templateName,
      documentTypeId: contractType.id,
      providerTemplateId,
      recipientRole,
      tokenMappingJson: null,
      fieldMappingJson: null,
      isActive: true,
    },
    create: {
      id: '2b549fa1-82a5-41b2-87ad-45796a3626f6',
      name: templateName,
      documentTypeId: contractType.id,
      providerTemplateId,
      recipientRole,
      tokenMappingJson: null,
      fieldMappingJson: null,
      isActive: true,
    },
  });

  const masterUser = await prisma.user.upsert({
    where: { email: masterEmail },
    update: {
      companyProfileId: companyProfile.id,
      passwordHash,
      role: UserRole.MASTER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: masterEmail,
      companyProfileId: companyProfile.id,
      passwordHash,
      role: UserRole.MASTER,
      status: UserStatus.ACTIVE,
    },
  });

  const existingNormalUser = await prisma.user.findFirst({
    where: {
      email: { in: [userEmail, legacyUserEmail] },
    },
  });

  const normalUser = existingNormalUser
    ? await prisma.user.update({
        where: { id: existingNormalUser.id },
        data: {
          email: userEmail,
          companyProfileId: companyProfile.id,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      })
    : await prisma.user.create({
        data: {
          email: userEmail,
          companyProfileId: companyProfile.id,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });

  const documentConfigWhere = {
    userId_documentTypeId_formDefinitionId_signatureTemplateId: {
      userId: normalUser.id,
      documentTypeId: contractType.id,
      formDefinitionId: formDefinition.id,
      signatureTemplateId: signatureTemplate.id,
    },
  };

  await prisma.userDocumentConfig.upsert({
    where: documentConfigWhere,
    update: {
      isActive: true,
    },
    create: {
      userId: normalUser.id,
      documentTypeId: contractType.id,
      formDefinitionId: formDefinition.id,
      signatureTemplateId: signatureTemplate.id,
      isActive: true,
    },
  });

  console.log({
    companyProfileId: companyProfile.id,
    contractTypeId: contractType.id,
    formDefinitionId: formDefinition.id,
    signatureTemplateId: signatureTemplate.id,
    providerTemplateId: signatureTemplate.providerTemplateId,
    recipientRole: signatureTemplate.recipientRole,
    credentials: {
      master: {
        email: masterEmail,
        password: defaultPassword,
        role: masterUser.role,
      },
      user: {
        email: userEmail,
        password: defaultPassword,
        role: normalUser.role,
      },
    },
  });
}

function buildWorldPaversLogoDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">
      <rect width="256" height="256" rx="64" fill="#022977"/>
      <path d="M52 176V72h36l40 62 40-62h36v104h-32v-52l-28 43h-32l-28-43v52H52z" fill="#ffffff"/>
      <circle cx="196" cy="60" r="18" fill="#05A5FF"/>
      <circle cx="60" cy="196" r="14" fill="#FF9900"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
