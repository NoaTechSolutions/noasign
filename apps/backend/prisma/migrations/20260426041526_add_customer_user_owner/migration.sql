-- NOA-233: per-user customer ownership (tenant isolation).
--
-- Adds Customer.userId as NOT NULL FK to users(id). Two-phase migration so it
-- works on tables that already contain rows:
--   1. ADD COLUMN nullable
--   2. Backfill: prefer the original creator (createdByUserId) when present,
--      otherwise fall back to the oldest MASTER user in the same tenant.
--   3. Enforce NOT NULL + add FK + indexes.

-- 1. Add nullable so existing rows survive the ADD COLUMN.
ALTER TABLE "customers" ADD COLUMN "userId" TEXT;

-- 2a. Backfill from createdByUserId where it exists.
UPDATE "customers"
   SET "userId" = "createdByUserId"
 WHERE "createdByUserId" IS NOT NULL
   AND "userId" IS NULL;

-- 2b. Fallback for orphans (createdByUserId NULL, e.g. user was deleted with
--     onDelete: SetNull): assign to the oldest MASTER user in the tenant.
UPDATE "customers" AS c
   SET "userId" = (
     SELECT u."id"
       FROM "users" AS u
      WHERE u."companyProfileId" = c."companyProfileId"
        AND u."role" = 'MASTER'
      ORDER BY u."createdAt" ASC
      LIMIT 1
   )
 WHERE c."userId" IS NULL;

-- 3. Enforce NOT NULL now that every row has a value.
ALTER TABLE "customers" ALTER COLUMN "userId" SET NOT NULL;

-- 4. Indexes for per-user lookups (master listing scoped by tenant + owner,
--    and direct ownership filters).
CREATE INDEX "customers_companyProfileId_userId_idx" ON "customers"("companyProfileId", "userId");
CREATE INDEX "customers_userId_idx" ON "customers"("userId");

-- 5. FK with onDelete: Restrict — can't delete a user who still owns
--    customers; admin must reassign first.
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
