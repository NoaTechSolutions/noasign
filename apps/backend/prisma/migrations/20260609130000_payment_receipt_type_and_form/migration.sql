-- Global catalog data for receipts: the PAYMENT_RECEIPT document type + its
-- form definition. Idempotent (safe on envs already seeded via the dev scripts).
-- The per-tenant ReceiptTemplate is NOT here — it's an onboarding script
-- (_seed-receipt-template.js), because its companyProfileId differs per env.

-- 1. DocumentType (DIRECT_PDF = generated/emailed receipt, no signature flow).
INSERT INTO "document_types" ("id", "name", "code", "generationMode")
VALUES ('d0c70000-0000-4000-8000-000000000001', 'Receipt', 'PAYMENT_RECEIPT', 'DIRECT_PDF')
ON CONFLICT ("code") DO NOTHING;

-- 2. FormDefinition (the validated receipt form schema). Insert only if the type
--    has no form yet → idempotent regardless of a pre-existing seeded form/id.
INSERT INTO "form_definitions" ("id", "name", "documentTypeId", "schemaJson", "isActive", "createdAt")
SELECT
  'f0a70000-0000-4000-8000-000000000001',
  'Payment Receipt Form',
  dt."id",
  '{"sections":[{"key":"receipt","label":"Receipt","fields":[{"key":"client","label":"Client","type":"text","required":true},{"key":"email","label":"Email","type":"email"},{"key":"amount","label":"Amount","type":"currency","required":true},{"key":"date","label":"Date","type":"date","required":true},{"key":"payment_method","label":"Payment method","type":"select","required":true,"options":[{"value":"CASH","label":"Cash"},{"value":"CREDIT_DEBIT_CARD","label":"Credit/Debit Card"},{"value":"CHEQUE","label":"Cheque"},{"value":"BANK_TRANSFER","label":"Bank Transfer"},{"value":"OTHER","label":"Other"}]},{"key":"other_label","label":"Other (label)","type":"text"},{"key":"payment_for","label":"Payment for","type":"text"},{"key":"payment_current","label":"Payment #","type":"number","default":"1"},{"key":"payment_total","label":"Of (total)","type":"number","default":"1"},{"key":"received_by","label":"Received by","type":"text"}]}]}'::jsonb,
  true,
  now()
FROM "document_types" dt
WHERE dt."code" = 'PAYMENT_RECEIPT'
  AND NOT EXISTS (
    SELECT 1 FROM "form_definitions" f WHERE f."documentTypeId" = dt."id"
  );
