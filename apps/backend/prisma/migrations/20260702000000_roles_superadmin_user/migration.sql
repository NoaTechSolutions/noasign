-- Collapse UserRole from {MASTER, ADMIN, USER} to {SUPERADMIN, USER}.
-- Mapping (Option 1, owner-approved 2026-07-02): the platform root master
-- (parentCompanyProfileId IS NULL) -> SUPERADMIN; every other MASTER (tenant
-- owner) + all ADMIN -> USER; USER stays USER.

-- 1. Demote ADMIN and any tenant-scoped MASTER to USER first (both are valid
--    values on the OLD enum, so no new value is needed here).
UPDATE "users"
SET "role" = 'USER'
WHERE "role" = 'ADMIN'
   OR ("role" = 'MASTER' AND "parentCompanyProfileId" IS NOT NULL);

-- 2. Swap the enum. Create the 2-value type, cast the column mapping the
--    remaining root MASTERs -> SUPERADMIN (everything else -> USER), then drop
--    the old type and rename. Avoids ALTER TYPE ... ADD VALUE (which can't be
--    used in the same transaction).
CREATE TYPE "UserRole_new" AS ENUM ('SUPERADMIN', 'USER');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'MASTER' THEN 'SUPERADMIN'
      ELSE 'USER'
    END
  )::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
