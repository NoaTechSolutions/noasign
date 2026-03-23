ALTER TABLE "pandadoc_templates"
ADD COLUMN "recipientRole" TEXT NOT NULL DEFAULT 'Client',
ADD COLUMN "tokenMappingJson" JSONB,
ADD COLUMN "fieldMappingJson" JSONB,
ADD COLUMN "sendSubjectTemplate" TEXT,
ADD COLUMN "sendMessageTemplate" TEXT;

ALTER TABLE "documents"
ADD COLUMN "pandadocStatus" TEXT,
ADD COLUMN "pandadocLastSyncedAt" TIMESTAMP(3);
