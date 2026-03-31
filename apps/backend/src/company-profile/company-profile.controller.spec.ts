import { Test, TestingModule } from '@nestjs/testing';
import { CompanyProfileController } from './company-profile.controller';
import { CompanyProfileService } from './company-profile.service';

const companyProfileServiceMock = {
  getMyCompanyProfile: jest.fn(),
  updateMyCompanyProfile: jest.fn(),
};

describe('CompanyProfileController', () => {
  let controller: CompanyProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyProfileController],
      providers: [
        {
          provide: CompanyProfileService,
          useValue: companyProfileServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CompanyProfileController>(CompanyProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
