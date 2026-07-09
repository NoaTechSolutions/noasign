-- Additive: extend TemplateCategory with INVOICE (DIRECT_PDF, rendered via AcroForm
-- fill). Non-destructive; existing RECEIPT/CONTRACT values are untouched.
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'INVOICE';
