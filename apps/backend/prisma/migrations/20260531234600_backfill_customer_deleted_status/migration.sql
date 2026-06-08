-- Backfill: clients soft-deleted under the previous `deletedAt`-only scheme had
-- their `status` left as ACTIVE. Now that `status` is the source of truth for the
-- delete state (see 20260531234435_add_customer_deleted_status), mark every row
-- with a non-null `deletedAt` as DELETED so it stays excluded from the default view.
-- Runs in its own migration because Postgres forbids using a freshly-added enum
-- value in the same migration that created it.
UPDATE "customers" SET "status" = 'DELETED' WHERE "deletedAt" IS NOT NULL;
