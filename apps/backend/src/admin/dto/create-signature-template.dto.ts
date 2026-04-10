import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSignatureTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  documentTypeId: string;

  @IsString()
  @IsNotEmpty()
  providerTemplateId: string;

  @IsOptional()
  @IsString()
  recipientRole?: string;

  @IsOptional()
  tokenMappingJson?: unknown;

  @IsOptional()
  fieldMappingJson?: unknown;

  @IsOptional()
  @IsString()
  sendSubjectTemplate?: string;

  @IsOptional()
  @IsString()
  sendMessageTemplate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
