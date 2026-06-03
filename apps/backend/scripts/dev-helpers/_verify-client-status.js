// Throwaway verification — confirms the regenerated Prisma Client knows the new
// Customer.status field, reads jane's clients with status, and flips one to
// INACTIVE using the TYPED API (the exact write that errored before regen).
// Leaves Maria Garcia INACTIVE as mixed demo data for the UI test.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const jane = await prisma.user.findUnique({
    where: { email: 'jane.smith@test.ntssign.com' },
    select: { id: true, companyProfileId: true },
  });
  if (!jane) throw new Error('jane.smith not found');

  console.log('Before:');
  const before = await prisma.customer.findMany({
    where: { companyProfileId: jane.companyProfileId },
    select: { fullName: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  before.forEach((c) => console.log(`  ${c.status.padEnd(9)} ${c.fullName}`));

  // Typed update with status — this is what threw "Unknown argument status"
  // before the client was regenerated.
  const maria = await prisma.customer.findFirst({
    where: { email: 'maria.garcia@example.com', companyProfileId: jane.companyProfileId },
    select: { id: true },
  });
  if (maria) {
    await prisma.customer.update({ where: { id: maria.id }, data: { status: 'INACTIVE' } });
    console.log('\n✅ Typed status update succeeded (Maria Garcia → INACTIVE).');
  } else {
    console.log('\n⚠️  Maria Garcia not found — skipped the update demo.');
  }

  const counts = await prisma.customer.groupBy({
    by: ['status'],
    where: { companyProfileId: jane.companyProfileId },
    _count: { _all: true },
  });
  console.log('\nStatus distribution for jane\'s tenant:');
  counts.forEach((c) => console.log(`  ${c.status}: ${c._count._all}`));
}

run()
  .catch((e) => { console.error('❌', e.message || e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
