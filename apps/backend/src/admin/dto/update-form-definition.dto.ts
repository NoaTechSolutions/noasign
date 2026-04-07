import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateFormDefinitionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @IsOptional()
  schemaJson?: unknown;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
