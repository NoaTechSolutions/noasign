-- Step-2 lead enrichment: optional follow-up details (name + phone). Both
-- nullable — the signer may submit only the email in step 1 and skip step 2.
ALTER TABLE "leads" ADD COLUMN "name" TEXT;
ALTER TABLE "leads" ADD COLUMN "phone" TEXT;
