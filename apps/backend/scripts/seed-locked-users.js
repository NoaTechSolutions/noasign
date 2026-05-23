// Seed 5 test users with varying lockout states for LockedUsersPanel V2 testing.
//
// Email pattern: <state>.locked-test@example.com  — easy to identify + cleanup
// via unseed-locked-users.js.
//
// Timing is calibrated against the real backend cooldown (15min, from
// auth.service.ts LOCKOUT_DURATION_MS). The V2 panel adapter derives
// `lockedAt = lockedUntil - 15min`, so seed values keep `lockedUntil` within
// the 15min window so the "Locked X ago" display is sensible.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Placeholder bcrypt-format hash — valid string shape, never matches any
// password. These accounts are LOCKED and meant to be never-loggable test data.
const PLACEHOLDER_HASH =
  '$2b$10$LOCKEDTESTUSERNEVERLOGSINabcdefghijklmnopqrstuvwxyz12345678';

const now = Date.now();
const min = (n) => new Date(now + n * 60_000);
const minAgo = (n) => new Date(now - n * 60_000);

const testUsers = [
  {
    email: 'fresh.locked-test@example.com',
    lockedUntil: min(13),
    failedLoginAttempts: 5,
    // Adapter computes lockedAt = lockedUntil - 15min → ~now - 2min
    // UI: "Locked 2m ago • in 13m" (normal countdown)
    description: 'Fresh lock — locked ~2m ago, unlock in 13m',
  },
  {
    email: 'mid.locked-test@example.com',
    lockedUntil: min(7),
    failedLoginAttempts: 5,
    description: 'Mid lock — locked ~8m ago, unlock in 7m',
  },
  {
    email: 'urgent.locked-test@example.com',
    lockedUntil: min(3),
    failedLoginAttempts: 5,
    // <5min → countdown displays in RED
    description: 'URGENT lock — locked ~12m ago, unlock in 3m (red countdown)',
  },
  {
    email: 'expiring.locked-test@example.com',
    lockedUntil: min(1),
    failedLoginAttempts: 5,
    description: 'EXPIRING lock — locked ~14m ago, unlock in 1m (red)',
  },
  {
    email: 'unlocked-old.locked-test@example.com',
    lockedUntil: minAgo(120),
    failedLoginAttempts: 5,
    // lockedUntil in the past → adapter sees user as UNLOCKED
    // (lockedUntil is kept in DB for audit; backend filters by lockedUntil>now in /admin/users/locked,
    //  so this user will NOT appear in the panel — keeping the row in case you
    //  want to query directly or test the panel's UNLOCKED status rendering
    //  with a tweaked query in the future)
    description: 'Already unlocked — 2h ago (will NOT show in panel; backend filters lockedUntil>now)',
  },
];

async function seed() {
  console.log('🔒 Seeding test locked users...\n');

  for (const u of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        lockedUntil: u.lockedUntil,
        failedLoginAttempts: u.failedLoginAttempts,
        status: 'ACTIVE',
      },
      create: {
        email: u.email,
        passwordHash: PLACEHOLDER_HASH,
        role: 'USER',
        status: 'ACTIVE',
        companyProfileId: null,
        lockedUntil: u.lockedUntil,
        failedLoginAttempts: u.failedLoginAttempts,
      },
    });

    console.log(`  ✅ ${u.email}`);
    console.log(`     ${u.description}`);
    console.log(`     id=${user.id} lockedUntil=${u.lockedUntil.toISOString()}\n`);
  }

  // Show what the GET /admin/users/locked endpoint will return.
  const now = new Date();
  const visible = await prisma.user.count({
    where: {
      email: { endsWith: '.locked-test@example.com' },
      lockedUntil: { gt: now },
    },
  });
  console.log(`📊 Panel will show ${visible} locked test users (the 5th is already past lockedUntil, backend filters it).`);
  console.log('🎉 Done. Open localhost:3001/dashboard?panel=lockedUsers as MASTER.\n');
  console.log('🧹 To clean up: node apps/backend/scripts/unseed-locked-users.js');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
