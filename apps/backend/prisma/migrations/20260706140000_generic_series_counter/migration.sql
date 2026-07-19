-- Generalize the visible-series counter (REC-/INV-…) to per (tenant, docType, year).
-- Additive: new table + a backfill copy from receipt_counters that PRESERVES
-- lastNumber, so the receipt REC- series continues at the exact same next number.
-- receipt_counters is left in place (frozen legacy) — nothing dropped.

-- CreateTable
CREATE TABLE "document_series_counters" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_series_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_series_counters_companyProfileId_idx" ON "document_series_counters"("companyProfileId");

-- CreateIndex
CREATE INDEX "document_series_counters_documentTypeId_idx" ON "document_series_counters"("documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "document_series_counters_companyProfileId_documentTypeId_ye_key" ON "document_series_counters"("companyProfileId", "documentTypeId", "year");

-- AddForeignKey
ALTER TABLE "document_series_counters" ADD CONSTRAINT "document_series_counters_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_series_counters" ADD CONSTRAINT "document_series_counters_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from the legacy per-(tenant, year) receipt counter, mapping every row
-- to the PAYMENT_RECEIPT document type and preserving lastNumber (continuity).
-- Idempotent: skips rows already present. No-op where the receipt type is absent.
INSERT INTO "document_series_counters" ("id", "companyProfileId", "documentTypeId", "year", "lastNumber")
SELECT gen_random_uuid()::text, rc."companyProfileId", dt."id", rc."year", rc."lastNumber"
FROM "receipt_counters" rc
CROSS JOIN (SELECT "id" FROM "document_types" WHERE "code" = 'PAYMENT_RECEIPT' LIMIT 1) dt
WHERE NOT EXISTS (
  SELECT 1 FROM "document_series_counters" dsc
  WHERE dsc."companyProfileId" = rc."companyProfileId"
    AND dsc."documentTypeId" = dt."id"
    AND dsc."year" = rc."year"
);
