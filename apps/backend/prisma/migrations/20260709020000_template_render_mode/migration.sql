-- Additive: per-template render mode for the PDF engine.
--   "overlay"  (default) = stamp text at absolute coordinates over the base PDF
--                          (the 3 approved receipts — behavior unchanged).
--   "acroform"           = fill named AcroForm fields on the base PDF, then flatten
--                          (invoices).
-- Existing rows default to 'overlay', so this is a no-op for receipts.
ALTER TABLE "receipt_template_standards"
  ADD COLUMN IF NOT EXISTS "renderMode" TEXT NOT NULL DEFAULT 'overlay';
