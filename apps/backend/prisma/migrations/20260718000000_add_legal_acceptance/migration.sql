-- Legal acceptance mechanism: versioned, append-only ToS/Privacy acceptance.
-- ADDITIVE (2 new tables + 1 new enum, NO ALTER to existing tables) so it applies
-- cleanly over the drifted local DB. Apply locally via `prisma db execute` +
-- `prisma migrate resolve`, never `migrate dev` (per the local DB's checksum drift).
-- SQL generated canonically via `prisma migrate diff` (schema-to-schema, no DB).

-- CreateEnum
CREATE TYPE "LegalDocType" AS ENUM ('TERMS', 'PRIVACY', 'COOKIES');

-- CreateTable
CREATE TABLE "legal_document_versions" (
    "id" TEXT NOT NULL,
    "docType" "LegalDocType" NOT NULL,
    "version" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "requiresReacceptance" BOOLEAN NOT NULL DEFAULT true,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "docType" "LegalDocType" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_document_versions_docType_version_key" ON "legal_document_versions"("docType", "version");

-- CreateIndex
CREATE INDEX "legal_acceptances_userId_idx" ON "legal_acceptances"("userId");

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "legal_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
