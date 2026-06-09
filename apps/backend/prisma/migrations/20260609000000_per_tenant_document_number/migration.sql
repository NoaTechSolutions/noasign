-- Per-tenant document correlativo.
-- Drop the GLOBAL unique on documentNumber and replace it with a composite
-- unique on (companyProfileId, documentTypeId, documentNumber), so each tenant
-- numbers its documents independently (000001, 000002, ...).
-- Safe: existing numbers are globally unique, therefore also unique within any
-- single (tenant, type) subset — no row can collide on the new index.
DROP INDEX "documents_documentNumber_key";
CREATE UNIQUE INDEX "documents_companyProfileId_documentTypeId_documentNumber_key"
  ON "documents"("companyProfileId", "documentTypeId", "documentNumber");
