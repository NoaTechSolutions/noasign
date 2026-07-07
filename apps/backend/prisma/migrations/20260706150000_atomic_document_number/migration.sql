-- Atomic per-(user, documentType) internal-number sequence. Replaces the O(n)
-- "load all docs + max-in-memory + 1" logic that also raced under concurrency.
-- Additive: new table + a backfill seeding lastNumber = the current max numeric
-- suffix per (user, type), so numbering continues at the same next value.

-- CreateTable
CREATE TABLE "user_document_sequences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_document_sequences_userId_idx" ON "user_document_sequences"("userId");

-- CreateIndex
CREATE INDEX "user_document_sequences_documentTypeId_idx" ON "user_document_sequences"("documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_document_sequences_userId_documentTypeId_key" ON "user_document_sequences"("userId", "documentTypeId");

-- AddForeignKey
ALTER TABLE "user_document_sequences" ADD CONSTRAINT "user_document_sequences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_sequences" ADD CONSTRAINT "user_document_sequences_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: for each (user, type) take the max numeric suffix of documents whose
-- number matches exactly "{code}-{digits}" (same set the old scan counted; mixed
-- non-numeric formats like SEED-… are ignored, matching prior behavior).
INSERT INTO "user_document_sequences" ("id", "userId", "documentTypeId", "lastNumber")
SELECT gen_random_uuid()::text, d."userId", d."documentTypeId",
       MAX( (substring(d."documentNumber" FROM char_length(dt."code") + 2))::int )
FROM "documents" d
JOIN "document_types" dt ON dt."id" = d."documentTypeId"
WHERE d."documentNumber" ~ ('^' || dt."code" || '-[0-9]+$')
GROUP BY d."userId", d."documentTypeId"
ON CONFLICT ("userId", "documentTypeId") DO NOTHING;
