import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateSignatureTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @IsOptional()
  @IsString()
  providerTemplateId?: string;

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
