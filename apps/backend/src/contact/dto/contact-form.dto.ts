import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ContactFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  turnstileToken!: string;

  @IsOptional()
  @IsIn(['en', 'es'])
  lang?: 'en' | 'es';
}
