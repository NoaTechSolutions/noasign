import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { UserRole, UserStatus } from '@prisma/client';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  companyProfile: {
    create: jest.fn(),
  },
};

const jwtServiceMock = {
  signAsync: jest.fn(),
};

const configServiceMock = {
  get: jest.fn(),
};

const emailServiceMock = {
  sendPasswordResetEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: EmailService,
          useValue: emailServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register creates a new company profile and assigns USER role', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.companyProfile.create.mockResolvedValue({
      id: 'company-1',
    });
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      companyProfileId: 'company-1',
      email: 'owner@ntssign.com',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      companyProfile: {
        id: 'company-1',
      },
    });

    const result = await service.register({
      email: 'owner@ntssign.com',
      password: 'secret123',
      companyName: 'New Company',
    });

    expect(prismaMock.companyProfile.create).toHaveBeenCalledWith({
      data: {
        companyName: 'New Company',
        email: 'owner@ntssign.com',
        contactEmail: 'owner@ntssign.com',
        isUnlimited: true,
        monthlyDocLimit: 0,
        planName: 'PRO_UNLIMITED',
      },
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        companyProfileId: 'company-1',
        email: 'owner@ntssign.com',
        passwordHash: expect.any(String),
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
      include: {
        companyProfile: true,
      },
    });
    expect(result).toEqual({
      message: 'User created successfully',
      user: {
        id: 'user-1',
        companyProfileId: 'company-1',
        email: 'owner@ntssign.com',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        companyProfile: {
          id: 'company-1',
        },
      },
    });
  });

  it('register normalizes email before persisting', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.companyProfile.create.mockResolvedValue({
      id: 'company-1',
    });
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      companyProfileId: 'company-1',
      email: 'owner@ntssign.com',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      companyProfile: {
        id: 'company-1',
      },
    });

    await service.register({
      email: ' Owner@NTSsign.com ',
      password: 'secret123',
      companyName: 'NTSsign',
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@ntssign.com' },
    });
    expect(prismaMock.companyProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@ntssign.com',
        contactEmail: 'owner@ntssign.com',
      }),
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@ntssign.com',
      }),
      include: {
        companyProfile: true,
      },
    });
  });
});
