-- Align the contract overage column default to the LAUNCH plan's canonical rate
-- ($3.50 — the schema's default plan). The old 5.00 matched no plan and leaked
-- into every tenant created without an explicit value.
--
-- This DDL only changes the DEFAULT for NEW rows. Backfilling existing $5 tenants
-- is a separate, owner-gated one-shot script (scripts/backfill-overage.js, run
-- with DRY_RUN first) — intentional per-tenant overrides must be reviewed, not
-- blindly rewritten.
ALTER TABLE "company_profiles" ALTER COLUMN "overagePrice" SET DEFAULT 3.50;
