import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
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

  // Master may assign the draft to another user in the same tenant (NOA-238).
  // Non-master attempts are rejected by the service layer.
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsObject()
  @IsNotEmpty()
  dataJson: Record<string, any>;

  @IsDateString()
  contractDate: string;
}
