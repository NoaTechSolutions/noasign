import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register creates a new company profile and assigns MASTER role', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.companyProfile.create.mockResolvedValue({
      id: 'company-1',
    });
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      companyProfileId: 'company-1',
      email: 'owner@noasign.com',
      passwordHash: 'hashed-password',
      role: UserRole.MASTER,
      status: UserStatus.ACTIVE,
      companyProfile: {
        id: 'company-1',
      },
    });

    const result = await service.register({
      email: 'owner@noasign.com',
      password: 'secret123',
    });

    expect(prismaMock.companyProfile.create).toHaveBeenCalledWith({
      data: {
        companyName: 'New Company',
        email: 'owner@noasign.com',
        contactEmail: 'owner@noasign.com',
      },
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        companyProfileId: 'company-1',
        email: 'owner@noasign.com',
        passwordHash: expect.any(String),
        role: UserRole.MASTER,
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
        email: 'owner@noasign.com',
        role: UserRole.MASTER,
        status: UserStatus.ACTIVE,
        companyProfile: {
          id: 'company-1',
        },
      },
    });
  });
});
