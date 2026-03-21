import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpdateDraftDocumentDto {
  @IsObject()
  @IsNotEmpty()
  dataJson: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  contractDate: string;
}
