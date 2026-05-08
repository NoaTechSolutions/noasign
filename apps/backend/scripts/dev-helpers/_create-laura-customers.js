// Throwaway one-shot — creates 6 test customers for Laura Bravo (3 PERSONAL,
// 3 BUSINESS) to exercise the "Use a customer" prefill flow during NOA-270
// Phase 1 testing.
//
// Idempotent — skips customers whose email already exists for Laura's tenant.
// Re-runnable safely.
//
// Prereq: Laura must exist (run _setup-invoice-test.js first).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createLauraCustomers() {
  console.log('🎯 Creating test customers for Laura Bravo...\n');

  const laura = await prisma.user.findUnique({
    where: { email: 'laura.bravo@ntssign.test' },
    include: { companyProfile: true },
  });

  if (!laura) {
    throw new Error('Laura Bravo not found in database');
  }

  console.log(`✅ Found Laura: ${laura.email}`);
  console.log(`   User ID: ${laura.id}`);
  console.log(`   Company: ${laura.companyProfile.legalName || 'N/A'}\n`);

  const personalCustomers = [
    {
      fullName: 'Carlos Mendoza',
      email: 'carlos.mendoza@example.com',
      phone: '+51 987 654 321',
      addressLine1: 'Av. Arequipa 1234',
      city: 'Lima',
      state: 'Lima',
      zipCode: '15046',
      country: 'Peru',
    },
    {
      fullName: 'Maria Rodriguez',
      email: 'maria.rodriguez@example.com',
      phone: '+51 998 765 432',
      addressLine1: 'Jr. Lampa 567',
      city: 'Lima',
      state: 'Lima',
      zipCode: '15001',
      country: 'Peru',
    },
    {
      fullName: 'Juan Perez',
      email: 'juan.perez@example.com',
      phone: '+51 955 123 456',
      addressLine1: 'Calle Los Olivos 890',
      city: 'Miraflores',
      state: 'Lima',
      zipCode: '15074',
      country: 'Peru',
    },
  ];

  const businessCustomers = [
    {
      customer: {
        fullName: 'Constructora San Martin SAC',
        email: 'contacto@sanmartin.com.pe',
        phone: '+51 987 111 222',
        addressLine1: 'Av. Javier Prado 2500',
        city: 'San Isidro',
        state: 'Lima',
        zipCode: '15036',
        country: 'Peru',
      },
      business: {
        businessName: 'Constructora San Martin SAC',
        primaryContactName: 'Roberto Gonzales',
      },
    },
    {
      customer: {
        fullName: 'Importaciones Del Sur EIRL',
        email: 'ventas@delsur.com.pe',
        phone: '+51 998 333 444',
        addressLine1: 'Jr. Carabaya 123',
        city: 'Lima',
        state: 'Lima',
        zipCode: '15001',
        country: 'Peru',
      },
      business: {
        businessName: 'Importaciones Del Sur EIRL',
        primaryContactName: 'Sofia Ramirez',
      },
    },
    {
      customer: {
        fullName: 'Tech Solutions Peru SAC',
        email: 'info@techsolutions.pe',
        phone: '+51 955 555 666',
        addressLine1: 'Av. La Marina 1800',
        city: 'San Miguel',
        state: 'Lima',
        zipCode: '15088',
        country: 'Peru',
      },
      business: {
        businessName: 'Tech Solutions Peru SAC',
        primaryContactName: 'Diego Vargas',
      },
    },
  ];

  console.log('Creating PERSONAL customers...\n');
  for (const customerData of personalCustomers) {
    const existing = await prisma.customer.findFirst({
      where: {
        email: customerData.email,
        companyProfileId: laura.companyProfileId,
      },
    });

    if (existing) {
      console.log(`⏭️  Skip: ${customerData.fullName} (already exists)\n`);
      continue;
    }

    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        customerType: 'PERSONAL',
        userId: laura.id,
        companyProfileId: laura.companyProfileId,
        createdByUserId: laura.id,
      },
    });

    console.log(`✅ Created: ${customer.fullName}`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Phone: ${customer.phone}\n`);
  }

  console.log('Creating BUSINESS customers...\n');
  for (const { customer: customerData, business: businessData } of businessCustomers) {
    const existing = await prisma.customer.findFirst({
      where: {
        email: customerData.email,
        companyProfileId: laura.companyProfileId,
      },
    });

    if (existing) {
      console.log(`⏭️  Skip: ${businessData.businessName} (already exists)\n`);
      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ...customerData,
          customerType: 'BUSINESS',
          userId: laura.id,
          companyProfileId: laura.companyProfileId,
          createdByUserId: laura.id,
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

  console.log('🎉 Done! Laura now has 6 test customers (3 personal + 3 business)');
  console.log('\nVerify with (note: actual table names are lowercase via @@map):');
  console.log(`  SELECT * FROM customers WHERE "companyProfileId" = '${laura.companyProfileId}';`);
}

createLauraCustomers()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
