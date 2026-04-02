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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

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
        companyName: 'New Company',
        email: normalizedEmail,
        contactEmail: normalizedEmail,
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
    const user = await this.validateUser(email, password);

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
