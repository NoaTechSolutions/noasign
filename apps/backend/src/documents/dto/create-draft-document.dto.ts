import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';

export class CreateDraftDocumentDto {
  @IsUUID()
  documentTypeId: string;

  @IsUUID()
  formDefinitionId: string;

  @IsUUID()
  pandadocTemplateId: string;

  @IsObject()
  @IsNotEmpty()
  dataJson: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  contractDate: string;
}