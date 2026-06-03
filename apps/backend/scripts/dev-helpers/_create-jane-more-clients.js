// Throwaway one-shot — adds 20 more clients for jane.smith (14 PERSONAL,
// 6 BUSINESS; 3 INACTIVE for mixed-data testing) so jane's tenant has 35+
// total clients → 4 pages × 10/page in the V2 panel.
//
// Idempotent — skips by email + companyProfileId.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JANE_EMAIL = 'jane.smith@test.ntssign.com';

const PERSONAL = [
  ['James Wilson',        'james.wilson@example.com',        '(602) 555-0101', '12 Cactus Way',     'Phoenix',     'AZ', '85001'],
  ['Mary Davis',          'mary.davis@example.com',          '(813) 555-0102', '47 Palm St',        'Tampa',       'FL', '33602'],
  ['John Brown',          'john.brown@example.com',          '(206) 555-0103', '89 Pike Ave',       'Seattle',     'WA', '98101'],
  ['Patricia Miller',     'patricia.miller@example.com',     '(617) 555-0104', '23 Beacon Hill',    'Boston',      'MA', '02108', 'INACTIVE'],
  ['Michael Anderson',    'michael.anderson@example.com',    '(303) 555-0105', '156 Mile High Rd',  'Denver',      'CO', '80202'],
  ['Linda Taylor',        'linda.taylor@example.com',        '(503) 555-0106', '7 Rose Garden Ln',  'Portland',    'OR', '97201', 'INACTIVE'],
  ['David Thomas',        'david.thomas@example.com',        '(615) 555-0107', '88 Music Row',      'Nashville',   'TN', '37203'],
  ['Barbara Jackson',     'barbara.jackson@example.com',     '(313) 555-0108', '301 Motor Ave',     'Detroit',     'MI', '48201'],
  ['Richard White',       'richard.white@example.com',       '(702) 555-0109', '999 Strip Blvd',    'Las Vegas',   'NV', '89101'],
  ['Susan Harris',        'susan.harris@example.com',        '(404) 555-0110', '42 Peachtree St',   'Atlanta',     'GA', '30301'],
  ['Joseph Martin',       'joseph.martin@example.com',       '(901) 555-0111', '15 Beale St',       'Memphis',     'TN', '38103'],
  ['Jessica Thompson',    'jessica.thompson@example.com',    '(614) 555-0112', '78 Buckeye Ave',    'Columbus',    'OH', '43215'],
  ['Christopher Garcia',  'christopher.garcia@example.com',  '(704) 555-0113', '6 Tryon St',        'Charlotte',   'NC', '28202'],
  ['Sarah Martinez',      'sarah.martinez@example.com',      '(317) 555-0114', '32 Monument Cir',   'Indianapolis','IN', '46204'],
];

const BUSINESS = [
  ['Blue Sky Solutions LLC',     'Alex Cooper',     'contact@bluesky-solutions.com',     '(503) 555-0201', '14 Tech Park Dr',   'Portland',  'OR', '97204', 'INACTIVE'],
  ['Riverside Construction Co',  'Jordan Lewis',    'info@riverside-construction.com',   '(901) 555-0202', '88 River Rd',       'Memphis',   'TN', '38104'],
  ['Northwest Pavers Inc',       'Taylor Clark',    'sales@nw-pavers.com',               '(206) 555-0203', '420 Industrial Way','Seattle',   'WA', '98108'],
  ['Summit Building Group',      'Casey Walker',    'hello@summit-building.com',         '(303) 555-0204', '5 Summit Pl',       'Denver',    'CO', '80205'],
  ['Pacific Stoneworks LLC',     'Morgan Hall',     'contact@pacific-stoneworks.com',    '(415) 555-0205', '300 Bay St',        'San Francisco','CA','94110'],
  ['Capital Concrete Co',        'Robin Young',     'info@capital-concrete.com',         '(202) 555-0206', '1 Capitol Ave',     'Washington','DC', '20001'],
];

async function run() {
  const jane = await prisma.user.findUnique({
    where: { email: JANE_EMAIL },
    select: { id: true, companyProfileId: true },
  });
  if (!jane) throw new Error(`User not found: ${JANE_EMAIL}`);
  if (!jane.companyProfileId) throw new Error('jane has no companyProfileId');

  console.log(`✅ Found jane (companyProfileId=${jane.companyProfileId})\n`);

  let created = 0;
  let skipped = 0;

  console.log('Creating PERSONAL clients...');
  for (const [fullName, email, phone, addressLine1, city, state, zipCode, statusOverride] of PERSONAL) {
    const existing = await prisma.customer.findFirst({
      where: { email, companyProfileId: jane.companyProfileId },
    });
    if (existing) {
      console.log(`  ⏭️  Skip ${fullName}`);
      skipped++;
      continue;
    }
    await prisma.customer.create({
      data: {
        fullName, email, phone, addressLine1, city, state, zipCode, country: 'USA',
        customerType: 'PERSONAL',
        status: statusOverride || 'ACTIVE',
        userId: jane.id,
        companyProfileId: jane.companyProfileId,
        createdByUserId: jane.id,
      },
    });
    console.log(`  ✅ ${fullName}${statusOverride ? ` [${statusOverride}]` : ''}`);
    created++;
  }

  console.log('\nCreating BUSINESS clients...');
  for (const [businessName, contactName, email, phone, addressLine1, city, state, zipCode, statusOverride] of BUSINESS) {
    const existing = await prisma.customer.findFirst({
      where: { email, companyProfileId: jane.companyProfileId },
    });
    if (existing) {
      console.log(`  ⏭️  Skip ${businessName}`);
      skipped++;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: {
          fullName: businessName, email, phone, addressLine1, city, state, zipCode, country: 'USA',
          customerType: 'BUSINESS',
          status: statusOverride || 'ACTIVE',
          userId: jane.id,
          companyProfileId: jane.companyProfileId,
          createdByUserId: jane.id,
        },
      });
      await tx.customerBusiness.create({
        data: {
          customerId: c.id,
          businessName,
          primaryContactName: contactName,
        },
      });
    });
    console.log(`  ✅ ${businessName}${statusOverride ? ` [${statusOverride}]` : ''}`);
    created++;
  }

  const counts = await prisma.customer.groupBy({
    by: ['status'],
    where: { companyProfileId: jane.companyProfileId, deletedAt: null },
    _count: { _all: true },
  });
  const totalActive = await prisma.customer.count({
    where: { companyProfileId: jane.companyProfileId, deletedAt: null },
  });

  console.log(`\n📊 jane's tenant — active (non-deleted) summary:`);
  console.log(`   Total active: ${totalActive}  → ${Math.ceil(totalActive / 10)} pages × 10/page`);
  counts.forEach((c) => console.log(`   ${c.status}: ${c._count._all}`));
  console.log(`\n🎉 Done. Created ${created}, skipped ${skipped}.`);
}

run()
  .catch((e) => { console.error('❌', e.message || e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
