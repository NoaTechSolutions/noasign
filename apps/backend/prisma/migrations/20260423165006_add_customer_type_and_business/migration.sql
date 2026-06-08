-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PERSONAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'PERSONAL';

-- CreateTable
CREATE TABLE "customer_businesses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "businessPhone2" TEXT,
    "businessAddressLine1" TEXT,
    "businessAddressLine2" TEXT,
    "businessCity" TEXT,
    "businessState" TEXT,
    "businessZipCode" TEXT,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "primaryContactTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_businesses_customerId_key" ON "customer_businesses"("customerId");

-- CreateIndex
CREATE INDEX "customers_companyProfileId_customerType_idx" ON "customers"("companyProfileId", "customerType");

-- AddForeignKey
ALTER TABLE "customer_businesses" ADD CONSTRAINT "customer_businesses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
