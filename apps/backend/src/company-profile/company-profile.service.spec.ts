import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyProfileService } from './company-profile.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
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
      role: 'SUPERADMIN',
      accountType: null, // SUPERADMIN has no accountType
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

  describe('setTimezoneIfUnset', () => {
    it('sets the timezone when the tenant has none yet (first-write-wins)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        companyProfileId: 'company-1',
      });
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        timezone: null,
      });
      prismaMock.companyProfile.update.mockResolvedValue({
        timezone: 'America/Argentina/Buenos_Aires',
      });

      const result = await service.setTimezoneIfUnset(
        'user-1',
        'America/Argentina/Buenos_Aires',
      );

      expect(prismaMock.companyProfile.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { timezone: 'America/Argentina/Buenos_Aires' },
        select: { timezone: true },
      });
      expect(result).toEqual({ timezone: 'America/Argentina/Buenos_Aires' });
    });

    it('does NOT overwrite an already-detected timezone', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        companyProfileId: 'company-1',
      });
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        timezone: 'America/New_York',
      });

      const result = await service.setTimezoneIfUnset(
        'user-1',
        'Europe/Madrid',
      );

      expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
      expect(result).toEqual({ timezone: 'America/New_York' });
    });

    it('rejects an invalid IANA timezone', async () => {
      await expect(
        service.setTimezoneIfUnset('user-1', 'Not/A_Zone'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
