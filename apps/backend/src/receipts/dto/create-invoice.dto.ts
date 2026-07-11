import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Invoice creation payload. `data` is the schema-driven wizard's FLAT field map
 * (billed_to name/address + service fields + quantity/price). Money totals are
 * recomputed server-side from quantity × price, so the client's computed
 * total/subtotal/gran_total are ignored — only quantity + price are trusted.
 */
export class CreateInvoiceDto {
  @IsObject()
  data!: Record<string, string>;

  @IsOptional()
  @IsString()
  customerId?: string;
}
