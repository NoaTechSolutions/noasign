import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDraftDocumentDto {
  @IsUUID()
  documentTypeId: string;

  @IsUUID()
  formDefinitionId: string;

  @IsOptional()
  @IsUUID()
  signatureTemplateId?: string;

  @IsObject()
  @IsNotEmpty()
  dataJson: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  contractDate: string;
}
