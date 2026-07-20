-- K8: split a PERSONAL customer's name into parts so invoice/receipt create can map
-- each to its own field. Nullable + additive: existing rows keep fullName, the parts
-- are backfilled going forward (form falls back to splitting fullName when absent).
ALTER TABLE "customers" ADD COLUMN "firstName" TEXT;
ALTER TABLE "customers" ADD COLUMN "middleName" TEXT;
ALTER TABLE "customers" ADD COLUMN "lastName" TEXT;
