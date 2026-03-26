import { AccountRequestStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAccountRequestStatusDto {
  @IsEnum(AccountRequestStatus)
  status!: AccountRequestStatus;
}
