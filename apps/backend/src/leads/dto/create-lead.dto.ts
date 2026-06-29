import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Optional capture-point tag (defaults to 'signature-complete' server-side).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
