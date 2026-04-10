import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDocumentConfigDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  documentTypeId: string;

  @IsUUID()
  formDefinitionId: string;

  @IsUUID()
  signatureTemplateId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
