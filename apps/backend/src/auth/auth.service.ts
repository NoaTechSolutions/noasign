import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { AuthException } from './exceptions/auth.exception';

// Two layers reinforce each other: HTTP middleware blocks per-IP, DB lockout
// blocks per-account. An attacker rotating IPs through proxies still trips
// the per-account lockout after N attempts on the same email.
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(data: RegisterDto) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const companyProfile = await this.prisma.companyProfile.create({
      data: {
        companyName: data.companyName.trim(),
        email: normalizedEmail,
        contactEmail: normalizedEmail,
        planName: 'PRO_UNLIMITED',
        isUnlimited: true,
        monthlyDocLimit: 0,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        companyProfileId: companyProfile.id,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: UserRole.MASTER,
        status: UserStatus.ACTIVE,
      },
      include: {
        companyProfile: true,
      },
    });

    const { passwordHash, ...safeUser } = user;

    return {
      message: 'User created successfully',
      user: safeUser,
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Same generic error for "user not found" and "wrong password" prevents
    // email enumeration via the response shape.
    if (!user) {
      throw AuthException.invalidCredentials();
    }

    // Lockout check BEFORE bcrypt to avoid burning CPU on a known-blocked
    // account. retryAfter is in seconds for parity with HTTP Retry-After.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000,
      );
      throw AuthException.accountLocked(retryAfter);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw AuthException.accountNotActive();
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      const justLocked = await this.recordFailedLogin(
        user.id,
        user.failedLoginAttempts,
      );
      // If THIS attempt tripped the lockout, surface ACCOUNT_LOCKED now —
      // otherwise the user sees INVALID_CREDENTIALS and only learns later.
      if (justLocked) {
        void this.sendAccountLockedEmail(user.email);
        throw AuthException.accountLocked(LOCKOUT_DURATION_MS / 1000);
      }
      throw AuthException.invalidCredentials();
    }

    // Success: reset counter, clear any expired lockout, record lastLoginAt.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyProfileId: user.companyProfileId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login success',
      accessToken,
      user: {
        id: user.id,
        companyProfileId: user.companyProfileId,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // Returns true if this attempt was the one that activated the lockout.
  private async recordFailedLogin(
    userId: string,
    currentAttempts: number,
  ): Promise<boolean> {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      // Reset counter on lockout transition — lockedUntil is the actual
      // block signal, the counter is just the running tally between lockouts.
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
        },
      });
      return true;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: nextAttempts },
    });
    return false;
  }

  private async sendAccountLockedEmail(email: string): Promise<void> {
    this.logger.log('Sending account-locked email (lockout triggered)');
    const unlocksAt = new Date(Date.now() + LOCKOUT_DURATION_MS);
    const unlocksAtText = `at ${unlocksAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const appUrl =
      this.configService.get<string>('APP_URL')?.trim().replace(/\/$/, '') ||
      'http://127.0.0.1:3001';
    const resetLink = `${appUrl}/login?view=forgotPassword`;

    try {
      await this.emailService.sendAccountLockedEmail({
        to: email,
        unlocksAtText,
        resetLink,
      });
    } catch {
      // EmailService logged it. Lockout is the source of truth — email is
      // just a heads-up.
    }
  }

  async changePassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return {
      message: 'Password updated successfully',
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.status === UserStatus.ACTIVE) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

      await this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const appUrl =
        this.configService.get<string>('APP_URL')?.trim().replace(/\/$/, '') ||
        'http://127.0.0.1:3001';
      const resetLink = `${appUrl}/?resetToken=${resetToken}`;
      const firstName = user.firstName?.trim() || undefined;

      // Send in ALL environments. Swallow failures to avoid leaking
      // user existence via status code (enumeration attacks).
      try {
        await this.emailService.sendPasswordResetEmail({
          to: normalizedEmail,
          resetLink,
          firstName,
        });
      } catch (err) {
        this.logger.error(
          `Failed to send password reset email to ${normalizedEmail}: ${String(err)}`,
        );
      }

      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          `Password reset link for ${normalizedEmail}: ${resetLink}`,
        );
      }

      const baseResponse: { message: string; resetLink?: string } = {
        message:
          'If the email exists, recovery instructions will be sent to your inbox.',
      };

      if (process.env.NODE_ENV !== 'production') {
        baseResponse.resetLink = resetLink;
      }

      return baseResponse;
    }

    return {
      message:
        'If the email exists, recovery instructions will be sent to your inbox.',
    };
  }

  async resetPassword(token: string, password: string) {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new BadRequestException('Reset token is required');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(normalizedToken)
      .digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      resetRecord.expiresAt < new Date()
    ) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    if (!resetRecord.user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          // Successful reset is implicit proof the user controls the inbox,
          // so any lockout from forgotten-password retries is released.
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: {
          usedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetRecord.userId,
          usedAt: null,
          id: { not: resetRecord.id },
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Password reset successfully',
    };
  }
}
