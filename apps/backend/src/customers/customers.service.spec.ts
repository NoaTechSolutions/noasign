import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  customer: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const tenantUser = { id: 'u-1', companyProfileId: 'cp-1' };
const noTenantUser = { id: 'u-2', companyProfileId: null };

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
  });

  describe('create', () => {
    it('creates a customer scoped to the user tenant', async () => {
      prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });
      await service.create(tenantUser, { fullName: 'Acme Corp' });
      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullName: 'Acme Corp',
          companyProfileId: 'cp-1',
          createdByUserId: 'u-1',
        }),
      });
    });

    it('throws ForbiddenException when user has no tenant scope', async () => {
      await expect(
        service.create(noTenantUser, { fullName: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });

    it('trims fullName and converts empty optional strings to null', async () => {
      prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });
      await service.create(tenantUser, {
        fullName: '  Acme  ',
        email: '',
        phone: '  ',
        city: 'Buenos Aires',
      });
      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullName: 'Acme',
          email: null,
          phone: null,
          city: 'Buenos Aires',
        }),
      });
    });
  });

  describe('list', () => {
    it('scopes to tenant and returns paginated result with defaults', async () => {
      prismaMock.$transaction.mockResolvedValue([[{ id: 'c-1' }], 1]);
      const res = await service.list(tenantUser, {});
      expect(res.total).toBe(1);
      expect(res.limit).toBe(25);
      expect(res.offset).toBe(0);
      expect(res.customers).toHaveLength(1);
    });

    it('applies search across fullName and email (case-insensitive)', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);
      await service.list(tenantUser, { search: 'john' });
      expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyProfileId: 'cp-1',
            OR: [
              { fullName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('orders by fullName asc when orderBy=name orderDir=asc', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);
      await service.list(tenantUser, { orderBy: 'name', orderDir: 'asc' });
      expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fullName: 'asc' } }),
      );
    });

    it('throws ForbiddenException when user has no tenant scope', async () => {
      await expect(service.list(noTenantUser, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('returns customer when found in tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        id: 'c-1',
        _count: { documents: 2 },
      });
      const res = await service.findOne(tenantUser, 'c-1');
      expect(res.id).toBe('c-1');
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'c-1', companyProfileId: 'cp-1' },
        include: { _count: { select: { documents: true } } },
      });
    });

    it('throws NotFoundException when customer not in tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne(tenantUser, 'other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates only after verifying tenant ownership', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'c-1' });
      prismaMock.customer.update.mockResolvedValue({ id: 'c-1', fullName: 'New' });
      await service.update(tenantUser, 'c-1', { fullName: 'New' });
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'c-1', companyProfileId: 'cp-1' },
      });
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: expect.objectContaining({ fullName: 'New' }),
      });
    });

    it('throws NotFoundException if customer not in tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.update(tenantUser, 'other', { fullName: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes after verifying ownership', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'c-1' });
      await service.delete(tenantUser, 'c-1');
      expect(prismaMock.customer.delete).toHaveBeenCalledWith({
        where: { id: 'c-1' },
      });
    });

    it('throws NotFoundException if customer not in tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.delete(tenantUser, 'other'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.customer.delete).not.toHaveBeenCalled();
    });
  });
});
