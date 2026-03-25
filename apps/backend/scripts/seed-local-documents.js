const { PrismaClient, DocumentStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const masterEmail = process.env.LOCAL_MASTER_EMAIL || 'master@ntssign.test';
  const userEmail = process.env.LOCAL_USER_EMAIL || 'user@ntssign.test';

  const existingDocuments = await prisma.document.count();
  if (existingDocuments > 0) {
    console.log({ message: 'Local documents already exist', count: existingDocuments });
    return;
  }

  const [masterUser, normalUser, contractType, formDefinition, pandaTemplate] =
    await Promise.all([
      prisma.user.findUnique({ where: { email: masterEmail } }),
      prisma.user.findUnique({ where: { email: userEmail } }),
      prisma.documentType.findUnique({ where: { code: 'CON' } }),
      prisma.formDefinition.findUnique({
        where: { id: '55bf672d-f307-46df-abe7-f2f7b9ca653c' },
      }),
      prisma.pandaDocTemplate.findUnique({
        where: { id: '2b549fa1-82a5-41b2-87ad-45796a3626f6' },
      }),
    ]);

  if (!masterUser || !normalUser || !contractType || !formDefinition || !pandaTemplate) {
    throw new Error('Missing local bootstrap data. Run npm run bootstrap:local first.');
  }

  const documents = [
    {
      documentNumber: 'CON-000001',
      userId: masterUser.id,
      companyProfileId: masterUser.companyProfileId,
      status: DocumentStatus.DRAFT,
      contractDate: new Date('2026-03-20'),
      dataJson: {
        customer_name: 'John Rivera',
        customer_email: 'john.rivera@example.com',
        customer_phone: '(858) 555-2000',
        customer_address: '456 Owner St',
        city: 'Chula Vista',
        state: 'CA',
        zip: '91910',
      },
    },
    {
      documentNumber: 'CON-000002',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.SENT,
      contractDate: new Date('2026-03-21'),
      sentAt: new Date('2026-03-21T10:30:00.000Z'),
      dataJson: {
        customer_name: 'Maria Lopez',
        customer_email: 'maria.lopez@example.com',
        customer_phone: '(619) 555-2010',
        customer_address: '789 Project Ave',
        city: 'San Diego',
        state: 'CA',
        zip: '92109',
      },
    },
    {
      documentNumber: 'CON-000003',
      userId: normalUser.id,
      companyProfileId: normalUser.companyProfileId,
      status: DocumentStatus.COMPLETED,
      contractDate: new Date('2026-03-18'),
      sentAt: new Date('2026-03-18T09:00:00.000Z'),
      viewedAt: new Date('2026-03-18T12:00:00.000Z'),
      signedAt: new Date('2026-03-18T15:00:00.000Z'),
      completedAt: new Date('2026-03-19T09:15:00.000Z'),
      countedInBilling: true,
      billingPeriod: '2026-03',
      dataJson: {
        customer_name: 'David Torres',
        customer_email: 'david.torres@example.com',
        customer_phone: '(760) 555-2200',
        customer_address: '1025 Desert View Dr',
        city: 'Palm Springs',
        state: 'CA',
        zip: '92262',
      },
    },
    {
      documentNumber: 'CON-000004',
      userId: masterUser.id,
      companyProfileId: masterUser.companyProfileId,
      status: DocumentStatus.CANCELLED,
      contractDate: new Date('2026-03-17'),
      cancelledAt: new Date('2026-03-17T18:45:00.000Z'),
      dataJson: {
        customer_name: 'Sofia Martinez',
        customer_email: 'sofia.martinez@example.com',
        customer_phone: '(442) 555-2400',
        customer_address: '88 Mission Rd',
        city: 'Oceanside',
        state: 'CA',
        zip: '92054',
      },
    },
  ];

  for (let index = 0; index < documents.length; index += 1) {
    const item = documents[index];
    const document = await prisma.document.create({
      data: {
        documentNumber: item.documentNumber,
        userId: item.userId,
        companyProfileId: item.companyProfileId,
        documentTypeId: contractType.id,
        formDefinitionId: formDefinition.id,
        pandadocTemplateId: pandaTemplate.id,
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
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
