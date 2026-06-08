-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "customers_companyProfileId_deletedAt_idx" ON "customers"("companyProfileId", "deletedAt");
