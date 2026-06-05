import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export const PAYMENT_METHODS = [
  'CASH',
  'CREDIT_DEBIT_CARD',
  'CHEQUE',
  'BANK_TRANSFER',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class CreateReceiptDto {
  @IsString()
  client: string;

  // Numeric amount; the generator formats it as $X,XXX.XX.
  amount: number;

  // Display date for the receipt (e.g. "06/04/2026"). Free-form so the caller
  // controls the format that the template expects.
  @IsString()
  date: string;

  @IsIn(PAYMENT_METHODS)
  payment_method: PaymentMethod;

  // Internal contact phone — captured + stored in dataJson, NOT drawn on the
  // PDF (it has no slot in the receipt template's fieldMappingJson).
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  other_label?: string;

  @IsOptional()
  @IsString()
  payment_for?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  payment_current?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  payment_total?: number;

  @IsOptional()
  @IsString()
  received_by?: string;

  // Optional link to a customer (for the documents list / future filtering).
  @IsOptional()
  @IsUUID()
  customerId?: string;

  // When true the receipt is emailed to recipientEmail and stored as SENT.
  @IsOptional()
  @IsBoolean()
  send?: boolean;

  @ValidateIf((o: CreateReceiptDto) => o.send === true)
  @IsEmail()
  recipientEmail?: string;
}
