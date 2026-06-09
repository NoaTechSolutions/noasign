-- Per-USER document correlativo (rework of the per-tenant version).
-- Drop the per-tenant composite unique and replace it with a per-user one, so
-- each user numbers their own documents from 000001 (a master creating with
-- another user's global form gets a number from their OWN sequence).
--
-- Runs correctly on BOTH states because migrations apply in order:
--   * local/staging: already at the per-tenant index (from 20260609000000) → drop it.
--   * prod: 20260609000000 runs first (global → per-tenant), THEN this drops that.
-- So in both cases the index to drop is the per-tenant one.
-- Data-safe: numbers were globally unique ⊇ unique within any (user, type) subset.
DROP INDEX "documents_companyProfileId_documentTypeId_documentNumber_key";
CREATE UNIQUE INDEX "documents_userId_documentTypeId_documentNumber_key"
  ON "documents"("userId", "documentTypeId", "documentNumber");
