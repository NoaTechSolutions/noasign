-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "title"        TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "city"         TEXT,
  ADD COLUMN "state"        TEXT,
  ADD COLUMN "zipCode"      TEXT;
