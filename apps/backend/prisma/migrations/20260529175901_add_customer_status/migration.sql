-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "customers_companyProfileId_status_idx" ON "customers"("companyProfileId", "status");
