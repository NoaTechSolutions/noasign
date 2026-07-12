import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Invoice creation payload. `data` is the schema-driven wizard's FLAT field map
 * (billed_to name/address + service fields + quantity/price). Money totals are
 * recomputed server-side from quantity × price, so the client's computed
 * total/subtotal/gran_total are ignored — only quantity + price are trusted.
 *
 * When `send` is true the invoice PDF is emailed to `recipientEmail` (same
 * mechanism as receipts) and stored as SENT; otherwise it stays a DRAFT.
 */
export class CreateInvoiceDto {
  @IsObject()
  data!: Record<string, string>;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsBoolean()
  send?: boolean;

  // Opt-in (only meaningful for a future issue date): email the creator when the
  // deferred invoice reaches its issue date and is ready to finalize.
  @IsOptional()
  @IsBoolean()
  notifyOnIssueDate?: boolean;

  // Required (and format-checked) only when sending.
  @ValidateIf((o: CreateInvoiceDto) => o.send === true)
  @IsEmail()
  recipientEmail?: string;
}
