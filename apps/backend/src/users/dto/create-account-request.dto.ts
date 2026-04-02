import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAccountRequestDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestedDocumentTypes!: string[];
}
