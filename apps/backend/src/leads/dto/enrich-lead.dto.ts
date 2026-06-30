import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Step 2 of the lead flow — optional follow-up details merged into the lead
 * created in step 1. Both fields are optional (the signer can fill only one),
 * but the service rejects a payload with neither. Phone validation is lax on
 * purpose: it's optional and free-form (WhatsApp/SMS), so we only cap length.
 */
export class EnrichLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
