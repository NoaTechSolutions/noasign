import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AccountRequestStatus, UserRole, UserStatus } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import { UpdateAccountRequestStatusDto } from './dto/update-account-request-status.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private async getMasterRequester(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.companyProfileId) {
      throw new BadRequestException('User does not have a company profile');
    }

    if (user.role !== UserRole.MASTER) {
      throw new ForbiddenException('Only master users can manage users');
    }

    return user;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async createAccountRequest(body: CreateAccountRequestDto) {
    const normalizedEmail = body.email.trim().toLowerCase();
    const normalizedFullName = body.fullName.trim().replace(/\s+/g, ' ');
    const requestedDocumentTypes = body.requestedDocumentTypes
      .map((item) => item.trim())
      .filter(Boolean);

    if (!normalizedFullName) {
      throw new BadRequestException('Full name is required');
    }

    if (requestedDocumentTypes.length === 0) {
      throw new BadRequestException(
        'Select at least one requested document type',
      );
    }

    const [existingUser, existingRequest] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      }),
      this.prisma.accountRequest.findUnique({
        where: { email: normalizedEmail },
      }),
    ]);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    if (existingRequest) {
      throw new BadRequestException('An account request already exists for this email');
    }

    const request = await this.prisma.accountRequest.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        requestedDocumentTypes,
      },
    });

    return {
      message: 'Account request submitted successfully',
      request,
    };
  }

  async listAccountRequests(requesterId: string) {
    await this.getMasterRequester(requesterId);

    return this.prisma.accountRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateAccountRequestStatus(
    requesterId: string,
    requestId: string,
    body: UpdateAccountRequestStatusDto,
  ) {
    await this.getMasterRequester(requesterId);

    const existingRequest = await this.prisma.accountRequest.findUnique({
      where: { id: requestId },
    });

    if (!existingRequest) {
      throw new NotFoundException('Account request not found');
    }

    const updatedRequest = await this.prisma.accountRequest.update({
      where: { id: requestId },
      data: {
        status: body.status,
        processedAt:
          body.status === AccountRequestStatus.PENDING ? null : new Date(),
      },
    });

    return {
      message: 'Account request updated successfully',
      request: updatedRequest,
    };
  }

  async listUsers(requesterId: string) {
    const requester = await this.getMasterRequester(requesterId);

    const users = await this.prisma.user.findMany({
      where: {
        companyProfileId: requester.companyProfileId,
      },
      include: {
        companyProfile: {
          select: {
            id: true,
            companyName: true,
            planName: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async createUser(requesterId: string, body: CreateUserDto) {
    const requester = await this.getMasterRequester(requesterId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const createdUser = await this.prisma.user.create({
      data: {
        companyProfileId: requester.companyProfileId,
        email: body.email,
        passwordHash,
        mustChangePassword: false,
        role: body.role ?? UserRole.USER,
        status: body.status ?? UserStatus.ACTIVE,
      },
    });

    return {
      message: 'User created successfully',
      user: this.sanitizeUser(createdUser),
    };
  }

  async updateUser(requesterId: string, targetUserId: string, body: UpdateUserDto) {
    const requester = await this.getMasterRequester(requesterId);
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        companyProfileId: requester.companyProfileId,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (body.email && body.email !== targetUser.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser && existingUser.id !== targetUser.id) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (
      requester.id === targetUser.id &&
      ((body.role && body.role !== UserRole.MASTER) ||
        body.status === UserStatus.INACTIVE ||
        body.status === UserStatus.SUSPENDED)
    ) {
      throw new BadRequestException(
        'Master users cannot demote or deactivate themselves',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        email: body.email,
        role: body.role,
        status: body.status,
      },
    });

    return {
      message: 'User updated successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  async resetUserPassword(
    requesterId: string,
    targetUserId: string,
    body: ResetUserPasswordDto,
  ) {
    const requester = await this.getMasterRequester(requesterId);
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        companyProfileId: requester.companyProfileId,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (requester.id === targetUser.id && body.temporary) {
      throw new BadRequestException(
        'Master users cannot assign themselves a temporary password',
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: body.temporary,
      },
    });

    return {
      message: body.temporary
        ? 'Temporary password set successfully'
        : 'Password updated successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }
}
