-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('RECEIPT', 'CONTRACT');

-- AlterTable
ALTER TABLE "receipt_templates" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "standardId" TEXT;

-- AlterTable
ALTER TABLE "signature_templates" ADD COLUMN     "companyProfileId" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStandard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "receipt_template_standards" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePdfPath" TEXT NOT NULL,
    "pageWidth" DOUBLE PRECISION NOT NULL DEFAULT 612,
    "pageHeight" DOUBLE PRECISION NOT NULL DEFAULT 792,
    "mediaBoxOffsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldMappingJson" JSONB NOT NULL,
    "numberFormat" TEXT NOT NULL DEFAULT 'REC-{YYYY}-{NNNN}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_template_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_templates" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "receiptStandardId" TEXT,
    "receiptTemplateId" TEXT,
    "signatureTemplateId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipt_template_standards_slug_key" ON "receipt_template_standards"("slug");

-- CreateIndex
CREATE INDEX "company_templates_companyProfileId_category_idx" ON "company_templates"("companyProfileId", "category");

-- CreateIndex
CREATE INDEX "company_templates_receiptStandardId_idx" ON "company_templates"("receiptStandardId");

-- CreateIndex
CREATE INDEX "company_templates_receiptTemplateId_idx" ON "company_templates"("receiptTemplateId");

-- CreateIndex
CREATE INDEX "company_templates_signatureTemplateId_idx" ON "company_templates"("signatureTemplateId");

-- CreateIndex
CREATE INDEX "receipt_templates_standardId_idx" ON "receipt_templates"("standardId");

-- CreateIndex
CREATE UNIQUE INDEX "signature_templates_slug_key" ON "signature_templates"("slug");

-- CreateIndex
CREATE INDEX "signature_templates_companyProfileId_idx" ON "signature_templates"("companyProfileId");

-- AddForeignKey
ALTER TABLE "signature_templates" ADD CONSTRAINT "signature_templates_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_templates" ADD CONSTRAINT "receipt_templates_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "receipt_template_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_templates" ADD CONSTRAINT "company_templates_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_templates" ADD CONSTRAINT "company_templates_receiptStandardId_fkey" FOREIGN KEY ("receiptStandardId") REFERENCES "receipt_template_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_templates" ADD CONSTRAINT "company_templates_receiptTemplateId_fkey" FOREIGN KEY ("receiptTemplateId") REFERENCES "receipt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_templates" ADD CONSTRAINT "company_templates_signatureTemplateId_fkey" FOREIGN KEY ("signatureTemplateId") REFERENCES "signature_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
