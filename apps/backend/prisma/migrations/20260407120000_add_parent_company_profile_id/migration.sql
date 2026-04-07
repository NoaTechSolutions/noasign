-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "parentCompanyProfileId" TEXT;

-- Backfill: existing sub-users (non-MASTER) had companyProfileId = master's company,
-- so parentCompanyProfileId = companyProfileId for those rows.
UPDATE "users"
  SET "parentCompanyProfileId" = "companyProfileId"
  WHERE role != 'MASTER' AND "companyProfileId" IS NOT NULL;

-- Index
CREATE INDEX "users_parentCompanyProfileId_idx" ON "users"("parentCompanyProfileId");
