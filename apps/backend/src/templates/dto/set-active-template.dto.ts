import { IsIn, IsString, Matches } from 'class-validator';
import { TemplateCategory } from '@prisma/client';

// Categories the DIRECT_PDF template picker supports today. CONTRACT lives on a
// different model (SignatureTemplate) and is out of scope for this module.
export const SELECTABLE_CATEGORIES = [
  TemplateCategory.RECEIPT,
  TemplateCategory.INVOICE,
] as const;
export type SelectableCategory = (typeof SELECTABLE_CATEGORIES)[number];

export class SetActiveTemplateDto {
  @IsIn(SELECTABLE_CATEGORIES)
  category: SelectableCategory;

  // Catalog slug of the standard to activate (e.g. "receipt-moderno-v1").
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, digits and hyphens',
  })
  slug: string;
}
