import { IsBoolean, IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsBoolean()
  temporary!: boolean;
}
