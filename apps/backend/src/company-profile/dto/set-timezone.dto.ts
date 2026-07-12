import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body for PATCH /company-profile/timezone — the browser-detected IANA zone. */
export class SetTimezoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezone!: string;
}
