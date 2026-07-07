-- No-op enganche prep (data-only): give every tenant that has an active receipt
-- template a default CompanyTemplate(RECEIPT) pointing at the SAME template the
-- legacy resolver picks (newest active by createdAt) — so the V2 resolver returns
-- an identical result and the switch is a provable no-op. Idempotent: skips any
-- tenant that already has a RECEIPT default (e.g. onboarding-provisioned ones).
INSERT INTO "company_templates" ("id", "companyProfileId", "category", "receiptTemplateId", "receiptStandardId", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."companyProfileId", 'RECEIPT', t."id", t."standardId", true, true, now(), now()
FROM (
  SELECT DISTINCT ON (rt."companyProfileId") rt."id", rt."companyProfileId", rt."standardId"
  FROM "receipt_templates" rt
  WHERE rt."isActive" = true
  ORDER BY rt."companyProfileId", rt."createdAt" DESC
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "company_templates" ct
  WHERE ct."companyProfileId" = t."companyProfileId"
    AND ct."category" = 'RECEIPT'
    AND ct."isDefault" = true
);
