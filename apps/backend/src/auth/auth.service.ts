import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async register(data: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const companyProfile = await this.prisma.companyProfile.create({
      data: {
        companyName: 'New Company',
        email: data.email,
        contactEmail: data.email,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        companyProfileId: companyProfile.id,
        email: data.email,
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
      },
    };
  }
}
