import { Test, TestingModule } from '@nestjs/testing';
import { AuthnpmController } from './authnpm.controller';

describe('AuthnpmController', () => {
  let controller: AuthnpmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthnpmController],
    }).compile();

    controller = module.get<AuthnpmController>(AuthnpmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
