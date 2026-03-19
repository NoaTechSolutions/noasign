import { Type } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';

export class BillingSummaryQueryDto {
  @IsOptional()
  @Type(() => String)
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}