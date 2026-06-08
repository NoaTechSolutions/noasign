-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'SEND_FAILED';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "providerEmailId" TEXT,
ADD COLUMN     "sendError" TEXT;
