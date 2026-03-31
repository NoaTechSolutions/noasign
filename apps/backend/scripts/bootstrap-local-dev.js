const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

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
    },
    create: {
      id: '55bf672d-f307-46df-abe7-f2f7b9ca653c',
      name: 'Construction Contract Form A',
      description: 'Base form for construction contracts',
      isActive: true,
      documentTypeId: contractType.id,
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
