import { IsDateString, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  insuranceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  insurancePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactLastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactTitle?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactAddressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactAddressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactZipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactCountry?: string;
}
