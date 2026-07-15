-- L3: the creation form now BELONGS to the template standard (which is already
-- tenant-scoped via ownerCompanyProfileId), so the form inherits that isolation.
-- Closes the cross-tenant invoice-form leak: a tenant only ever gets its own
-- template's form, never another tenant's private one. Additive + nullable.
ALTER TABLE "receipt_template_standards" ADD COLUMN "formDefinitionId" TEXT;

CREATE INDEX "receipt_template_standards_formDefinitionId_idx" ON "receipt_template_standards"("formDefinitionId");

ALTER TABLE "receipt_template_standards" ADD CONSTRAINT "receipt_template_standards_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (backward-compat): point each existing standard at the active form for
-- its category. Matched by DOCUMENT TYPE CODE — NOT a hardcoded id — because
-- FormDefinition ids are generated uuids and differ per environment.
UPDATE "receipt_template_standards" s
SET "formDefinitionId" = (
  SELECT fd."id" FROM "form_definitions" fd
  JOIN "document_types" dt ON dt."id" = fd."documentTypeId"
  WHERE dt."code" = 'INVOICE' AND fd."isActive" = true
  ORDER BY fd."createdAt" DESC
  LIMIT 1
)
WHERE s."category" = 'INVOICE' AND s."formDefinitionId" IS NULL;

UPDATE "receipt_template_standards" s
SET "formDefinitionId" = (
  SELECT fd."id" FROM "form_definitions" fd
  JOIN "document_types" dt ON dt."id" = fd."documentTypeId"
  WHERE dt."code" = 'PAYMENT_RECEIPT' AND fd."isActive" = true
  ORDER BY fd."createdAt" DESC
  LIMIT 1
)
WHERE s."category" = 'RECEIPT' AND s."formDefinitionId" IS NULL;
