const { PrismaClient, UserRole, UserStatus, DocumentStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const companyProfileId =
    process.env.STAGING_DEMO_COMPANY_PROFILE_ID ||
    '7aaad16a-6d76-4c36-97c7-b9ce3e45b801';
  const masterEmail =
    process.env.STAGING_DEMO_MASTER_EMAIL || 'master@ntssign.test';
  const legacyUserEmail = 'user@ntssign.test';
  const userEmail =
    process.env.STAGING_DEMO_USER_EMAIL || 'ana.martinez@worldpaversco.test';
  const defaultPassword =
    process.env.STAGING_DEMO_USER_PASSWORD || 'secret123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const providerTemplateId =
    process.env.STAGING_DEMO_SIGNATURE_TEMPLATE_ID || 'DhBwzpbNdESYiCnPmjDLT9';
  const recipientRole =
    process.env.STAGING_DEMO_SIGNATURE_RECIPIENT_ROLE || 'BUYER';
  const templateName =
    process.env.STAGING_DEMO_SIGNATURE_TEMPLATE_NAME ||
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
    update: { name: 'Contract' },
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
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: masterEmail,
      companyProfileId: companyProfile.id,
      passwordHash,
      role: UserRole.SUPERADMIN,
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

  await prisma.userDocumentConfig.upsert({
    where: {
      userId_documentTypeId_formDefinitionId_signatureTemplateId: {
        userId: normalUser.id,
        documentTypeId: contractType.id,
        formDefinitionId: formDefinition.id,
        signatureTemplateId: signatureTemplate.id,
      },
    },
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

  const documents = [
    {
      documentNumber: 'CON-000001',
      userId: masterUser.id,
      companyProfileId: masterUser.companyProfileId,
      status: DocumentStatus.DRAFT,
      contractDate: new Date('2026-03-20'),
      dataJson: {
        customer_name: 'John Rivera',
        customer_email: 'noatechsolutions+johnrivera@gmail.com',
        customer_phone: '(858) 555-2000',
        customer_address: '456 Owner St',
        city: 'Chula Vista',
        state: 'CA',
        zip: '91910',
      },
    },
    {
      documentNumber: 'CON-000009',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.DRAFT,
      contractDate: new Date('2026-03-22'),
      dataJson: {
        customer_name: 'Julia Romero',
        customer_email: 'noatechsolutions+juliaromero@gmail.com',
        customer_phone: '(619) 555-2050',
        customer_address: '515 Coastal Blvd',
        city: 'La Jolla',
        state: 'CA',
        zip: '92037',
      },
    },
    {
      documentNumber: 'CON-000010',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.SENT,
      contractDate: new Date('2026-03-21'),
      sentAt: new Date('2026-03-21T10:30:00.000Z'),
      countedInBilling: false,
      dataJson: {
        customer_name: 'Maria Lopez',
        customer_email: 'noatechsolutions+marialopez@gmail.com',
        customer_phone: '(619) 555-2010',
        customer_address: '789 Project Ave',
        city: 'San Diego',
        state: 'CA',
        zip: '92109',
      },
    },
    {
      documentNumber: 'CON-000011',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.VIEWED,
      contractDate: new Date('2026-03-19'),
      sentAt: new Date('2026-03-19T09:00:00.000Z'),
      viewedAt: new Date('2026-03-19T14:20:00.000Z'),
      countedInBilling: true,
      billingPeriod: '2026-03',
      dataJson: {
        customer_name: 'Elena Chavez',
        customer_email: 'noatechsolutions+elenachavez@gmail.com',
        customer_phone: '(619) 555-2030',
        customer_address: '241 Harbor Point',
        city: 'Carlsbad',
        state: 'CA',
        zip: '92008',
      },
    },
    {
      documentNumber: 'CON-000012',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.SIGNED,
      contractDate: new Date('2026-03-18'),
      sentAt: new Date('2026-03-18T09:00:00.000Z'),
      viewedAt: new Date('2026-03-18T12:00:00.000Z'),
      signedAt: new Date('2026-03-18T15:00:00.000Z'),
      countedInBilling: true,
      billingPeriod: '2026-03',
      dataJson: {
        customer_name: 'Marco Diaz',
        customer_email: 'noatechsolutions+marcodiaz@gmail.com',
        customer_phone: '(760) 555-2210',
        customer_address: '765 Canyon Crest',
        city: 'Escondido',
        state: 'CA',
        zip: '92025',
      },
    },
    {
      documentNumber: 'CON-000013',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.COMPLETED,
      contractDate: new Date('2026-03-17'),
      sentAt: new Date('2026-03-17T09:00:00.000Z'),
      viewedAt: new Date('2026-03-17T12:00:00.000Z'),
      signedAt: new Date('2026-03-17T15:00:00.000Z'),
      completedAt: new Date('2026-03-18T09:15:00.000Z'),
      countedInBilling: true,
      billingPeriod: '2026-03',
      dataJson: {
        customer_name: 'David Torres',
        customer_email: 'noatechsolutions+davidtorres@gmail.com',
        customer_phone: '(760) 555-2200',
        customer_address: '1025 Desert View Dr',
        city: 'Palm Springs',
        state: 'CA',
        zip: '92262',
      },
    },
    {
      documentNumber: 'CON-000014',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.CANCELLED,
      contractDate: new Date('2026-03-16'),
      sentAt: new Date('2026-03-16T11:30:00.000Z'),
      cancelledAt: new Date('2026-03-16T18:45:00.000Z'),
      dataJson: {
        customer_name: 'Sofia Martinez',
        customer_email: 'noatechsolutions+sofiamartinez@gmail.com',
        customer_phone: '(442) 555-2400',
        customer_address: '88 Mission Rd',
        city: 'Oceanside',
        state: 'CA',
        zip: '92054',
      },
    },
  ];

  for (const item of documents) {
    const existingByNumber = await prisma.document.findUnique({
      where: { documentNumber: item.documentNumber },
    });

    if (existingByNumber) {
      console.log({
        skipped: item.documentNumber,
        status: item.status,
        reason: 'document number already exists',
      });
      continue;
    }

    const existingDocument = await prisma.document.findFirst({
      where: {
        userId: item.userId,
        status: item.status,
      },
    });

    if (existingDocument) {
      console.log({
        skipped: item.documentNumber,
        status: item.status,
        reason: 'status already exists for owner',
      });
      continue;
    }

    const document = await prisma.document.create({
      data: {
        documentNumber: item.documentNumber,
        userId: item.userId,
        companyProfileId: item.companyProfileId,
        documentTypeId: contractType.id,
        formDefinitionId: formDefinition.id,
        signatureTemplateId: signatureTemplate.id,
        status: item.status,
        contractDate: item.contractDate,
        sentAt: item.sentAt ?? null,
        viewedAt: item.viewedAt ?? null,
        signedAt: item.signedAt ?? null,
        completedAt: item.completedAt ?? null,
        cancelledAt: item.cancelledAt ?? null,
        countedInBilling: item.countedInBilling ?? false,
        isOverage: false,
        billingPeriod: item.billingPeriod ?? null,
        data: {
          create: {
            dataJson: item.dataJson,
          },
        },
      },
    });

    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        snapshotJson: item.dataJson,
        changedByUserId: item.userId,
      },
    });

    console.log({
      created: item.documentNumber,
      status: item.status,
      owner: item.userId === masterUser.id ? masterEmail : userEmail,
    });
  }

  console.log({
    companyProfileId: companyProfile.id,
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
