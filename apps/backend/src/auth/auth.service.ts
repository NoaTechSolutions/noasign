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

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LEVEL_1_DURATION_MS = 1 * 60 * 1000;   // 1 minute
const LEVEL_2_DURATION_MS = 5 * 60 * 1000;   // 5 minutes
const PERMANENT_LOCK_DATE = new Date('9999-12-31T23:59:59.999Z');

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

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      if (user.lockLevel >= 3) {
        throw AuthException.accountPermanentlyLocked();
      }
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
      const result = await this.recordFailedLogin(
        user.id,
        user.failedLoginAttempts,
        user.lockLevel,
      );
      if (result.justLocked) {
        void this.sendAccountLockedEmail(user.email, result.lockLevel);
        if (result.lockLevel >= 3) {
          throw AuthException.accountPermanentlyLocked();
        }
        throw AuthException.accountLocked(result.durationMs / 1000);
      }
      throw AuthException.invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockLevel: 0,
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

  private async recordFailedLogin(
    userId: string,
    currentAttempts: number,
    currentLockLevel: number,
  ): Promise<{ justLocked: boolean; lockLevel: number; durationMs: number }> {
    if (currentLockLevel === 0) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: 0,
            lockLevel: 1,
            lockedUntil: new Date(Date.now() + LEVEL_1_DURATION_MS),
          },
        });
        return { justLocked: true, lockLevel: 1, durationMs: LEVEL_1_DURATION_MS };
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: nextAttempts },
      });
      return { justLocked: false, lockLevel: 0, durationMs: 0 };
    }

    if (currentLockLevel === 1) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockLevel: 2,
          lockedUntil: new Date(Date.now() + LEVEL_2_DURATION_MS),
        },
      });
      return { justLocked: true, lockLevel: 2, durationMs: LEVEL_2_DURATION_MS };
    }

    // Level 2 expired, one more failure → permanent lock
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockLevel: 3,
        lockedUntil: PERMANENT_LOCK_DATE,
      },
    });
    return { justLocked: true, lockLevel: 3, durationMs: 0 };
  }

  private async sendAccountLockedEmail(
    email: string,
    lockLevel: number,
  ): Promise<void> {
    this.logger.log(
      `Sending account-locked email (level ${lockLevel} triggered)`,
    );

    const durationMs =
      lockLevel === 1
        ? LEVEL_1_DURATION_MS
        : lockLevel === 2
          ? LEVEL_2_DURATION_MS
          : 0;

    const unlocksAtText =
      lockLevel >= 3
        ? 'permanently (password reset required)'
        : `at ${new Date(Date.now() + durationMs).toLocaleTimeString('en-US', {
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
      // EmailService logged it.
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

      return {
        message: 'We sent a reset link to your email. It expires in 15 minutes.',
        userFound: true,
      };
    }

    return {
      message: "We couldn't find an account with that email.",
      userFound: false,
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
          failedLoginAttempts: 0,
          lockLevel: 0,
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
