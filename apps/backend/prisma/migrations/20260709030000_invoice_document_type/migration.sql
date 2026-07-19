-- Additive global catalog data: the INVOICE document type (DIRECT_PDF, rendered via
-- AcroForm fill). Idempotent (safe on envs already seeded via dev scripts).
-- The per-tenant template + form definition come with the invoice create flow
-- (owner sign-off pending — see docs/architecture/invoice-pdf-strategy.md).
INSERT INTO "document_types" ("id", "name", "code", "generationMode")
VALUES ('d0c70000-0000-4000-8000-000000000002', 'Invoice', 'INVOICE', 'DIRECT_PDF')
ON CONFLICT ("code") DO NOTHING;
