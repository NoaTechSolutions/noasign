import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock matches both array and callback $transaction usages. For the callback
// form, we invoke the callback with the prismaMock itself so each nested
// model method is observable via its jest spy.
const prismaMock = {
  customer: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  customerBusiness: {
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: callback form runs the callback with the mock itself; array form
  // resolves each Promise in the array.
  prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
});

const tenantUser = { id: 'u-1', companyProfileId: 'cp-1' };
const noTenantUser = { id: 'u-2', companyProfileId: null };

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
  });

  describe('create', () => {
    it('creates a PERSONAL customer scoped to the user tenant', async () => {
      prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });
      prismaMock.customer.findUniqueOrThrow.mockResolvedValue({
        id: 'c-1',
        fullName: 'Acme Corp',
        business: null,
        _count: { documents: 0 },
      });
      await service.create(tenantUser, { fullName: 'Acme Corp' });
      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullName: 'Acme Corp',
          companyProfileId: 'cp-1',
          createdByUserId: 'u-1',
          customerType: 'PERSONAL',
        }),
      });
      expect(prismaMock.customerBusiness.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user has no tenant scope', async () => {
      await expect(
        service.create(noTenantUser, { fullName: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });

    it('trims fullName and converts empty optional strings to null', async () => {
      prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });
      prismaMock.customer.findUniqueOrThrow.mockResolvedValue({ id: 'c-1' });
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

    it('creates a BUSINESS customer with nested business row in a transaction', async () => {
      prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });
      prismaMock.customer.findUniqueOrThrow.mockResolvedValue({
        id: 'c-1',
        customerType: 'BUSINESS',
        business: { id: 'b-1', businessName: 'Acme LLC' },
      });
      await service.create(tenantUser, {
        fullName: 'Acme Corp',
        customerType: 'BUSINESS',
        business: {
          businessName: '  Acme LLC  ',
          industry: 'Construction',
          businessEmail: '',
        },
      });
      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerType: 'BUSINESS',
          fullName: 'Acme Corp',
        }),
      });
      expect(prismaMock.customerBusiness.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'c-1',
          businessName: 'Acme LLC',
          industry: 'Construction',
          businessEmail: null,
        }),
      });
    });

    it('rejects BUSINESS customer without nested business object', async () => {
      await expect(
        service.create(tenantUser, {
          fullName: 'Acme',
          customerType: 'BUSINESS',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });

    it('rejects PERSONAL customer with a business object', async () => {
      await expect(
        service.create(tenantUser, {
          fullName: 'John',
          customerType: 'PERSONAL',
          business: { businessName: 'should not be here' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('scopes to tenant and returns paginated result with defaults', async () => {
      prismaMock.customer.findMany.mockResolvedValue([{ id: 'c-1' }]);
      prismaMock.customer.count.mockResolvedValue(1);
      const res = await service.list(tenantUser, {});
      expect(res.total).toBe(1);
      expect(res.limit).toBe(25);
      expect(res.offset).toBe(0);
      expect(res.customers).toHaveLength(1);
    });

    it('applies search across fullName and email (case-insensitive)', async () => {
      prismaMock.customer.findMany.mockResolvedValue([]);
      prismaMock.customer.count.mockResolvedValue(0);
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
      prismaMock.customer.findMany.mockResolvedValue([]);
      prismaMock.customer.count.mockResolvedValue(0);
      await service.list(tenantUser, { orderBy: 'name', orderDir: 'asc' });
      expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fullName: 'asc' } }),
      );
    });

    it('includes business relation + documents _count in findMany', async () => {
      prismaMock.customer.findMany.mockResolvedValue([]);
      prismaMock.customer.count.mockResolvedValue(0);
      await service.list(tenantUser, {});
      expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            _count: { select: { documents: true } },
            business: true,
          },
        }),
      );
    });

    it('throws ForbiddenException when user has no tenant scope', async () => {
      await expect(service.list(noTenantUser, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('returns customer with business + documents count when found in tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        id: 'c-1',
        _count: { documents: 2 },
        business: null,
      });
      const res = await service.findOne(tenantUser, 'c-1');
      expect(res.id).toBe('c-1');
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'c-1', companyProfileId: 'cp-1' },
        include: {
          _count: { select: { documents: true } },
          business: true,
        },
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
      prismaMock.customer.findFirst.mockResolvedValue({
        id: 'c-1',
        business: null,
      });
      prismaMock.customer.update.mockResolvedValue({ id: 'c-1', fullName: 'New' });
      prismaMock.customer.findUniqueOrThrow.mockResolvedValue({
        id: 'c-1',
        fullName: 'New',
      });
      await service.update(tenantUser, 'c-1', { fullName: 'New' });
      expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'c-1', companyProfileId: 'cp-1' },
        include: { business: true },
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

    it('updates existing business row on patch', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        id: 'c-1',
        business: { id: 'b-1', businessName: 'Old' },
      });
      prismaMock.customer.update.mockResolvedValue({ id: 'c-1' });
      prismaMock.customer.findUniqueOrThrow.mockResolvedValue({ id: 'c-1' });
      await service.update(tenantUser, 'c-1', {
        business: { industry: 'Roofing' },
      });
      expect(prismaMock.customerBusiness.update).toHaveBeenCalledWith({
        where: { customerId: 'c-1' },
        data: expect.objectContaining({ industry: 'Roofing' }),
      });
      expect(prismaMock.customerBusiness.create).not.toHaveBeenCalled();
    });

    it('creates a new business row when customer has none yet', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        id: 'c-1',
        business: null,
      });
      prismaMock.customer.update.mockResolvedValue({ id: 'c-1' });
      prismaMock.customer.findUniqueOrThrow.mockResolvedValue({ id: 'c-1' });
      await service.update(tenantUser, 'c-1', {
        customerType: 'BUSINESS',
        business: { businessName: 'Acme' },
      });
      expect(prismaMock.customerBusiness.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'c-1',
          businessName: 'Acme',
        }),
      });
    });

    it('rejects creating a business for a customer without businessName', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({
        id: 'c-1',
        business: null,
      });
      prismaMock.customer.update.mockResolvedValue({ id: 'c-1' });
      await expect(
        service.update(tenantUser, 'c-1', {
          business: { industry: 'No name provided' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
