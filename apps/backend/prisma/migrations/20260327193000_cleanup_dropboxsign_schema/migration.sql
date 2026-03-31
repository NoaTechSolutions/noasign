ALTER TYPE "StorageProvider" RENAME VALUE 'PANDADOC' TO 'DROPBOXSIGN';

ALTER TABLE "pandadoc_templates" RENAME TO "signature_templates";
ALTER TABLE "signature_templates"
  RENAME CONSTRAINT "pandadoc_templates_pkey" TO "signature_templates_pkey";
ALTER TABLE "signature_templates"
  RENAME CONSTRAINT "pandadoc_templates_documentTypeId_fkey" TO "signature_templates_documentTypeId_fkey";
ALTER INDEX "pandadoc_templates_documentTypeId_idx"
  RENAME TO "signature_templates_documentTypeId_idx";
ALTER TABLE "signature_templates"
  RENAME COLUMN "pandadocTemplateId" TO "providerTemplateId";

ALTER TABLE "user_document_configs"
  RENAME COLUMN "pandadocTemplateId" TO "signatureTemplateId";
ALTER TABLE "user_document_configs"
  RENAME CONSTRAINT "user_document_configs_pandadocTemplateId_fkey" TO "user_document_configs_signatureTemplateId_fkey";

ALTER TABLE "documents"
  RENAME COLUMN "pandadocTemplateId" TO "signatureTemplateId";
ALTER TABLE "documents"
  RENAME COLUMN "pandadocDocumentId" TO "providerDocumentId";
ALTER TABLE "documents"
  RENAME COLUMN "pandadocStatus" TO "providerStatus";
ALTER TABLE "documents"
  RENAME COLUMN "pandadocLastSyncedAt" TO "providerLastSyncedAt";
ALTER TABLE "documents"
  RENAME CONSTRAINT "documents_pandadocTemplateId_fkey" TO "documents_signatureTemplateId_fkey";
ALTER INDEX "documents_pandadocDocumentId_idx"
  RENAME TO "documents_providerDocumentId_idx";
