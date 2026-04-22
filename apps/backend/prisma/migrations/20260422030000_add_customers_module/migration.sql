-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "customerId" TEXT;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_companyProfileId_idx" ON "customers"("companyProfileId");

-- CreateIndex
CREATE INDEX "customers_companyProfileId_fullName_idx" ON "customers"("companyProfileId", "fullName");

-- CreateIndex
CREATE INDEX "customers_companyProfileId_email_idx" ON "customers"("companyProfileId", "email");

-- CreateIndex
CREATE INDEX "documents_customerId_idx" ON "documents"("customerId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
