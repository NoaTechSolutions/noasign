-- B7 soft-delete for documents. Additive + nullable so it applies cleanly over
-- the drifted local DB (applied via `prisma db execute` + `prisma migrate
-- resolve`, never `migrate dev`, per the local DB's checksum drift).
ALTER TABLE "documents" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Mirrors the customer soft-delete index: fast "live docs for this tenant" and
-- "deleted docs for this tenant" (SUPERADMIN) scans.
CREATE INDEX "documents_companyProfileId_deletedAt_idx" ON "documents"("companyProfileId", "deletedAt");
