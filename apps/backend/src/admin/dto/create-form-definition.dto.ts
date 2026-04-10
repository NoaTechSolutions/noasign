import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateFormDefinitionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  documentTypeId: string;

  @IsOptional()
  schemaJson?: unknown;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
