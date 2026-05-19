import { UserRole } from '@prisma/client';

export class LockedUserDto {
  id: string;
  email: string;
  role: UserRole;
  failedLoginAttempts: number;
  lockedUntil: Date;
}
