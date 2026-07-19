-- Decision A: generalize the DIRECT_PDF template tables (receipts today, invoices
-- next). Additive: new nullable columns + FKs, plus a backfill of existing rows
-- to the RECEIPT category / PAYMENT_RECEIPT document type.

-- AlterTable
ALTER TABLE "receipt_template_standards" ADD COLUMN     "category" "TemplateCategory",
ADD COLUMN     "documentTypeId" TEXT;

-- AlterTable
ALTER TABLE "receipt_templates" ADD COLUMN     "category" "TemplateCategory",
ADD COLUMN     "documentTypeId" TEXT;

-- CreateIndex
CREATE INDEX "receipt_template_standards_documentTypeId_idx" ON "receipt_template_standards"("documentTypeId");

-- CreateIndex
CREATE INDEX "receipt_templates_documentTypeId_idx" ON "receipt_templates"("documentTypeId");

-- AddForeignKey
ALTER TABLE "receipt_templates" ADD CONSTRAINT "receipt_templates_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_template_standards" ADD CONSTRAINT "receipt_template_standards_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing template is a RECEIPT of the PAYMENT_RECEIPT type.
-- (documentTypeId stays null in an env where the receipt type wasn't seeded.)
UPDATE "receipt_template_standards"
SET "category" = 'RECEIPT',
    "documentTypeId" = (SELECT "id" FROM "document_types" WHERE "code" = 'PAYMENT_RECEIPT' LIMIT 1)
WHERE "category" IS NULL;

UPDATE "receipt_templates"
SET "category" = 'RECEIPT',
    "documentTypeId" = (SELECT "id" FROM "document_types" WHERE "code" = 'PAYMENT_RECEIPT' LIMIT 1)
WHERE "category" IS NULL;
