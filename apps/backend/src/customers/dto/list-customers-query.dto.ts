import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  // Master can filter by owner ('me' as a special case → currentUser.id).
  // Non-master users have this overridden to their own id by the service.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsIn(['name', 'createdAt'])
  orderBy?: 'name' | 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc';
}
