// Throwaway one-shot — creates 4 test clients for jane.smith (2 PERSONAL,
// 2 BUSINESS) assigned to her tenant, for dashboard testing.
//
// Idempotent — skips clients whose email already exists for jane's tenant.
// Re-runnable safely. Fails clean if jane is not found or the DB is unreachable
// (the user lookup runs before any write).
//
// Note: the DB model is still `customer` (only the UI label was renamed to
// "Client"). This script writes to prisma.customer / prisma.customerBusiness.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JANE_EMAIL = 'jane.smith@test.ntssign.com';

async function createJaneClients() {
  console.log('🎯 Creating test clients for jane.smith...\n');

  const jane = await prisma.user.findUnique({
    where: { email: JANE_EMAIL },
    include: { companyProfile: true },
  });

  if (!jane) {
    throw new Error(`User not found: ${JANE_EMAIL}`);
  }
  if (!jane.companyProfileId) {
    throw new Error(`User ${JANE_EMAIL} has no companyProfileId (no tenant)`);
  }

  console.log(`✅ Found jane: ${jane.email}`);
  console.log(`   User ID: ${jane.id}`);
  console.log(`   Company: ${jane.companyProfile?.companyName || jane.companyProfile?.legalName || 'N/A'}`);
  console.log(`   companyProfileId: ${jane.companyProfileId}\n`);

  const personalClients = [
    {
      fullName: 'Robert Johnson',
      email: 'robert.johnson@example.com',
      phone: '(305) 555-1234',
      addressLine1: '456 Oak Ave',
      city: 'Houston',
      state: 'TX',
      zipCode: '77002',
      country: 'USA',
    },
    {
      fullName: 'Maria Garcia',
      email: 'maria.garcia@example.com',
      phone: '(713) 555-5678',
      addressLine1: '789 Pine St',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA',
    },
  ];

  const businessClients = [
    {
      customer: {
        fullName: 'Garcia Construction LLC',
        email: 'carlos@garciaconstruction.com',
        phone: '(512) 555-9012',
        addressLine1: '321 Business Blvd',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
        country: 'USA',
      },
      business: {
        businessName: 'Garcia Construction LLC',
        primaryContactName: 'Carlos Garcia',
      },
    },
    {
      customer: {
        fullName: 'Smith & Associates',
        email: 'sarah@smithassociates.com',
        phone: '(214) 555-3456',
        addressLine1: '555 Corporate Dr',
        city: 'San Antonio',
        state: 'TX',
        zipCode: '78201',
        country: 'USA',
      },
      business: {
        businessName: 'Smith & Associates',
        primaryContactName: 'Sarah Smith',
      },
    },
  ];

  console.log('Creating PERSONAL clients...\n');
  for (const clientData of personalClients) {
    const existing = await prisma.customer.findFirst({
      where: { email: clientData.email, companyProfileId: jane.companyProfileId },
    });

    if (existing) {
      console.log(`⏭️  Skip: ${clientData.fullName} (already exists)\n`);
      continue;
    }

    const created = await prisma.customer.create({
      data: {
        ...clientData,
        customerType: 'PERSONAL',
        userId: jane.id,
        companyProfileId: jane.companyProfileId,
        createdByUserId: jane.id,
      },
    });

    console.log(`✅ Created: ${created.fullName}`);
    console.log(`   Email: ${created.email}`);
    console.log(`   Phone: ${created.phone}\n`);
  }

  console.log('Creating BUSINESS clients...\n');
  for (const { customer: clientData, business: businessData } of businessClients) {
    const existing = await prisma.customer.findFirst({
      where: { email: clientData.email, companyProfileId: jane.companyProfileId },
    });

    if (existing) {
      console.log(`⏭️  Skip: ${businessData.businessName} (already exists)\n`);
      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ...clientData,
          customerType: 'BUSINESS',
          userId: jane.id,
          companyProfileId: jane.companyProfileId,
          createdByUserId: jane.id,
        },
      });

      const customerBusiness = await tx.customerBusiness.create({
        data: {
          customerId: customer.id,
          businessName: businessData.businessName,
          primaryContactName: businessData.primaryContactName,
        },
      });

      return { customer, customerBusiness };
    });

    console.log(`✅ Created: ${businessData.businessName}`);
    console.log(`   Contact: ${businessData.primaryContactName}`);
    console.log(`   Email: ${result.customer.email}\n`);
  }

  const total = await prisma.customer.count({
    where: { companyProfileId: jane.companyProfileId },
  });
  console.log(`🎉 Done! jane.smith's tenant now has ${total} client(s) total.`);
}

createJaneClients()
  .catch((e) => {
    console.error('❌ Error:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
