-- Issue-date feature (invoices + receipts): editable issue date + deferred-doc
-- tracking on documents, and a per-tenant IANA timezone. All columns are additive
-- (nullable or defaulted) so the change applies cleanly to existing rows —
-- drift-safe (applied via `prisma db execute` + `prisma migrate resolve`, never
-- `migrate dev`, per the local DB's checksum drift).

-- documents: user-editable issue date (calendar DATE, no time) + deferred-doc
-- state. createdAt is untouched — it stays the immutable real creation timestamp.
ALTER TABLE "documents"
  ADD COLUMN "issueDate" DATE,
  ADD COLUMN "isDeferred" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notifyOnIssueDate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deferredNotifiedAt" TIMESTAMP(3);

-- company_profiles: per-tenant IANA timezone. Nullable with NO default — NULL
-- means "not detected yet"; the browser-detected value is saved on first login
-- and app code falls back to America/New_York while NULL.
ALTER TABLE "company_profiles"
  ADD COLUMN "timezone" TEXT;
