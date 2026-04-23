import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Business data for a BUSINESS-type customer. Lives in its own table
 * (customer_businesses) with a 1:1 FK to customers.
 *
 * businessName is required when this DTO is sent; every other field is
 * optional and may be null/undefined. For PATCH use
 * UpdateCustomerBusinessDto instead (businessName optional too).
 */
export class CustomerBusinessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  businessName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessLegalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  website?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  businessEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  businessPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  businessPhone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessAddressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessAddressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessZipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryContactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  primaryContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryContactTitle?: string;
}

/**
 * All fields optional for PATCH. Note that businessName is optional here
 * because the update might touch only other fields — but the service
 * guards against clearing businessName to empty for an existing
 * business row.
 */
export class UpdateCustomerBusinessDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessLegalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  website?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  businessEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  businessPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  businessPhone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessAddressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessAddressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessZipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryContactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  primaryContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryContactTitle?: string;
}
