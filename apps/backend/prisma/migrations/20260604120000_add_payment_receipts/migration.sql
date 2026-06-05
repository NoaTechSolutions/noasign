-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('BOLDSIGN', 'DIRECT_PDF');

-- AlterTable
ALTER TABLE "document_types" ADD COLUMN     "generationMode" "GenerationMode" NOT NULL DEFAULT 'BOLDSIGN';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "receiptTemplateId" TEXT,
ALTER COLUMN "signatureTemplateId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "receipt_templates" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePdfPath" TEXT NOT NULL,
    "pageWidth" DOUBLE PRECISION NOT NULL DEFAULT 612,
    "pageHeight" DOUBLE PRECISION NOT NULL DEFAULT 792,
    "mediaBoxOffsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldMappingJson" JSONB NOT NULL,
    "numberFormat" TEXT NOT NULL DEFAULT 'REC-{YYYY}-{NNNN}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_counters" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipt_templates_companyProfileId_idx" ON "receipt_templates"("companyProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_counters_companyProfileId_year_key" ON "receipt_counters"("companyProfileId", "year");

-- AddForeignKey
ALTER TABLE "receipt_templates" ADD CONSTRAINT "receipt_templates_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_counters" ADD CONSTRAINT "receipt_counters_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_receiptTemplateId_fkey" FOREIGN KEY ("receiptTemplateId") REFERENCES "receipt_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

