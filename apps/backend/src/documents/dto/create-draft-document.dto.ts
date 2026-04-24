import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDraftDocumentDto {
  @IsUUID()
  documentTypeId: string;

  @IsUUID()
  formDefinitionId: string;

  @IsOptional()
  @IsUUID()
  signatureTemplateId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsObject()
  @IsNotEmpty()
  dataJson: Record<string, any>;

  @IsDateString()
  contractDate: string;
}
