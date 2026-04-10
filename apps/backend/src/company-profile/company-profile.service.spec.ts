import { Test, TestingModule } from '@nestjs/testing';
import { CompanyProfileService } from './company-profile.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  companyProfile: {
    update: jest.fn(),
  },
};

describe('CompanyProfileService', () => {
  let service: CompanyProfileService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyProfileService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CompanyProfileService>(CompanyProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updates only the current company profile with provided business fields', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      companyProfileId: 'company-1',
      role: 'MASTER',
      accountType: null, // MASTER has no accountType
    });
    prismaMock.companyProfile.update.mockResolvedValue({
      id: 'company-1',
      companyName: 'NTSSign LLC',
      contactPhone: '555-0100',
    });

    const result = await service.updateMyCompanyProfile('user-1', {
      companyName: 'NTSSign LLC',
      contactPhone: '555-0100',
    });

    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: {
        companyName: 'NTSSign LLC',
        contactPhone: '555-0100',
      },
    });
    expect(result).toEqual({
      id: 'company-1',
      companyName: 'NTSSign LLC',
      contactPhone: '555-0100',
    });
  });
});
