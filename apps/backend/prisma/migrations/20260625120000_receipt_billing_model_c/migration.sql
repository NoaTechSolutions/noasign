-- Model C: receipt billing (receipt quotas + RECEIPTS_ONLY plan + overage).
-- Additive only: existing PlanName values (LAUNCH/SCALE/PRO_UNLIMITED) are NOT
-- remapped, and existing tenants keep their plan + manual overrides.

-- 1. New plan names (additive). IF NOT EXISTS keeps re-runs safe. A freshly
--    added enum value cannot be USED in the same tx as its ADD VALUE, but these
--    columns below don't reference the new values, so a single file is fine.
ALTER TYPE "PlanName" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "PlanName" ADD VALUE IF NOT EXISTS 'PRO';
ALTER TYPE "PlanName" ADD VALUE IF NOT EXISTS 'PAY_PER_CONTRACT';
ALTER TYPE "PlanName" ADD VALUE IF NOT EXISTS 'RECEIPTS_ONLY';

-- 2. Per-tenant receipt-billing fields on company_profiles.
ALTER TABLE "company_profiles"
  ADD COLUMN "monthlyReceiptLimit" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "receiptsUnlimited" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "receiptOveragePrice" DECIMAL(10,2) NOT NULL DEFAULT 0.25,
  ADD COLUMN "contractsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- 3. Receipt-billing dimension on documents (separate from countedInBilling).
ALTER TABLE "documents"
  ADD COLUMN "countedAsReceipt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isReceiptOverage" BOOLEAN NOT NULL DEFAULT false;
