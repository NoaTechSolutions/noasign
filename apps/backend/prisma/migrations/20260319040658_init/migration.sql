-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MASTER', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('PREVIEW', 'SIGNED_PDF', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('PANDADOC', 'S3', 'R2');

-- CreateEnum
CREATE TYPE "PlanName" AS ENUM ('LAUNCH', 'SCALE', 'PRO_UNLIMITED');

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "logoUrl" TEXT,
    "licenseNumber" TEXT,
    "contactFirstName" TEXT,
    "contactLastName" TEXT,
    "contactTitle" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "planName" "PlanName" NOT NULL DEFAULT 'LAUNCH',
    "monthlyDocLimit" INTEGER NOT NULL DEFAULT 5,
    "overagePrice" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pandadoc_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "pandadocTemplateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pandadoc_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_document_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "formDefinitionId" TEXT NOT NULL,
    "pandadocTemplateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_document_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyProfileId" TEXT,
    "documentTypeId" TEXT NOT NULL,
    "formDefinitionId" TEXT NOT NULL,
    "pandadocTemplateId" TEXT NOT NULL,
    "pandadocDocumentId" TEXT,
    "status" "DocumentStatus" NOT NULL,
    "contractDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "countedInBilling" BOOLEAN NOT NULL DEFAULT false,
    "isOverage" BOOLEAN NOT NULL DEFAULT false,
    "billingPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_data" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "dataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyProfileId_idx" ON "users"("companyProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_name_key" ON "document_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_code_key" ON "document_types"("code");

-- CreateIndex
CREATE INDEX "form_definitions_documentTypeId_idx" ON "form_definitions"("documentTypeId");

-- CreateIndex
CREATE INDEX "pandadoc_templates_documentTypeId_idx" ON "pandadoc_templates"("documentTypeId");

-- CreateIndex
CREATE INDEX "user_document_configs_userId_idx" ON "user_document_configs"("userId");

-- CreateIndex
CREATE INDEX "user_document_configs_documentTypeId_idx" ON "user_document_configs"("documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_document_configs_userId_documentTypeId_formDefinitionI_key" ON "user_document_configs"("userId", "documentTypeId", "formDefinitionId", "pandadocTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_documentNumber_key" ON "documents"("documentNumber");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_companyProfileId_idx" ON "documents"("companyProfileId");

-- CreateIndex
CREATE INDEX "documents_documentTypeId_idx" ON "documents"("documentTypeId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "documents_pandadocDocumentId_idx" ON "documents"("pandadocDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_data_documentId_key" ON "document_data"("documentId");

-- CreateIndex
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "document_files_documentId_idx" ON "document_files"("documentId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pandadoc_templates" ADD CONSTRAINT "pandadoc_templates_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_configs" ADD CONSTRAINT "user_document_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_configs" ADD CONSTRAINT "user_document_configs_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_configs" ADD CONSTRAINT "user_document_configs_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_configs" ADD CONSTRAINT "user_document_configs_pandadocTemplateId_fkey" FOREIGN KEY ("pandadocTemplateId") REFERENCES "pandadoc_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_pandadocTemplateId_fkey" FOREIGN KEY ("pandadocTemplateId") REFERENCES "pandadoc_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_data" ADD CONSTRAINT "document_data_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
