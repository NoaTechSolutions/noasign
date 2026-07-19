-- Template visibility/ownership. Additive: a nullable owner FK on the catalog
-- standard. null = GLOBAL (all tenants see it); a set value = PRIVATE to that
-- tenant (only its users see it in the list; SUPERADMIN sees all). No data change
-- to existing rows (all stay global until explicitly associated).
ALTER TABLE "receipt_template_standards" ADD COLUMN "ownerCompanyProfileId" TEXT;

CREATE INDEX "receipt_template_standards_ownerCompanyProfileId_idx" ON "receipt_template_standards"("ownerCompanyProfileId");

ALTER TABLE "receipt_template_standards" ADD CONSTRAINT "receipt_template_standards_ownerCompanyProfileId_fkey" FOREIGN KEY ("ownerCompanyProfileId") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
