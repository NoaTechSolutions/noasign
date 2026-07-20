import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PAYMENT_METHODS, type PaymentMethod } from './create-receipt.dto';

// All fields optional — PATCH merges only what's provided. No `send` here: edit
// never emails; resend is its own endpoint. Only DRAFT/SEND_FAILED are editable
// (enforced in the service).
export class UpdateReceiptDto {
  @IsOptional()
  @IsString()
  client?: string;

  // Billed-to split (mirrors createReceipt). When present, the service recomposes
  // `client` from these and stores the parts in dataJson.
  @IsOptional()
  @IsBoolean()
  business?: boolean;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  middle_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  payment_method?: PaymentMethod;

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

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;
}
