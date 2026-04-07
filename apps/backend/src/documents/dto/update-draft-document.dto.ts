import { IsDateString, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateDraftDocumentDto {
  @IsObject()
  @IsNotEmpty()
  dataJson: Record<string, any>;

  @IsDateString()
  contractDate: string;
}
