import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
}
