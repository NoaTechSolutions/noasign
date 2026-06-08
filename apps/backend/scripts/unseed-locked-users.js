// Cleanup: removes all users created by seed-locked-users.js.
// Identifies them by email suffix `.locked-test@example.com`.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function unseed() {
  console.log('🧹 Removing test locked users...\n');

  const toDelete = await prisma.user.findMany({
    where: { email: { endsWith: '.locked-test@example.com' } },
    select: { id: true, email: true },
  });

  if (toDelete.length === 0) {
    console.log('  (no test users found — nothing to clean)\n');
    return;
  }

  for (const u of toDelete) {
    console.log(`  🗑️  ${u.email}`);
  }

  const result = await prisma.user.deleteMany({
    where: { email: { endsWith: '.locked-test@example.com' } },
  });

  console.log(`\n✅ Deleted ${result.count} test users.\n`);
}

unseed()
  .catch((err) => {
    console.error('❌ Unseed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
