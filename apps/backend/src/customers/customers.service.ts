import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Customer, CustomerBusiness, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

export type AuthUser = {
  id: string;
  companyProfileId: string | null;
};

export type CustomerWithCount = Customer & {
  _count: { documents: number };
  business: CustomerBusiness | null;
};

export type CustomerListResult = {
  customers: CustomerWithCount[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateCustomerDto) {
    const companyProfileId = requireTenant(user);
    const customerType = dto.customerType ?? 'PERSONAL';

    if (customerType === 'BUSINESS' && !dto.business) {
      throw new BadRequestException(
        'business object is required when customerType is BUSINESS',
      );
    }
    if (customerType === 'PERSONAL' && dto.business) {
      throw new BadRequestException(
        'business object only allowed when customerType is BUSINESS',
      );
    }

    const customerData = normalizeOptionalFields(stripNestedFields(dto));

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ...customerData,
          fullName: dto.fullName.trim(),
          customerType,
          companyProfileId,
          createdByUserId: user.id,
        },
      });

      if (dto.business) {
        const { businessName, ...rest } = dto.business;
        await tx.customerBusiness.create({
          data: {
            customerId: customer.id,
            businessName: businessName.trim(),
            ...normalizeOptionalFields(rest),
          },
        });
      }

      return tx.customer.findUniqueOrThrow({
        where: { id: customer.id },
        include: {
          _count: { select: { documents: true } },
          business: true,
        },
      });
    });
  }

  async list(
    user: AuthUser,
    query: ListCustomersQueryDto,
  ): Promise<CustomerListResult> {
    const companyProfileId = requireTenant(user);

    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const orderByField = query.orderBy ?? 'createdAt';
    const orderDir = query.orderDir ?? 'desc';

    const where: Prisma.CustomerWhereInput = { companyProfileId };

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      orderByField === 'name'
        ? { fullName: orderDir }
        : { createdAt: orderDir };

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          _count: { select: { documents: true } },
          business: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total, limit, offset };
  }

  async findOne(user: AuthUser, id: string) {
    const companyProfileId = requireTenant(user);

    const customer = await this.prisma.customer.findFirst({
      where: { id, companyProfileId },
      include: {
        _count: { select: { documents: true } },
        business: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    const companyProfileId = requireTenant(user);

    const existing = await this.prisma.customer.findFirst({
      where: { id, companyProfileId },
      include: { business: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const customerData: Prisma.CustomerUpdateInput = normalizeOptionalFields(
      stripNestedFields(dto),
    );
    if (dto.fullName !== undefined) {
      customerData.fullName = dto.fullName.trim();
    }
    if (dto.customerType !== undefined) {
      customerData.customerType = dto.customerType;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.customer.update({ where: { id }, data: customerData });

      if (dto.business !== undefined) {
        const { businessName, ...rest } = dto.business;
        const normalized = normalizeOptionalFields(rest);
        if (existing.business) {
          // Update existing business row; only touch businessName if sent.
          await tx.customerBusiness.update({
            where: { customerId: id },
            data: {
              ...(businessName !== undefined
                ? { businessName: businessName.trim() }
                : {}),
              ...normalized,
            },
          });
        } else {
          // Create new business row — businessName required.
          if (!businessName) {
            throw new BadRequestException(
              'businessName is required when attaching business data to an existing customer',
            );
          }
          await tx.customerBusiness.create({
            data: {
              customerId: id,
              businessName: businessName.trim(),
              ...normalized,
            },
          });
        }
      }

      return tx.customer.findUniqueOrThrow({
        where: { id },
        include: {
          _count: { select: { documents: true } },
          business: true,
        },
      });
    });
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    const companyProfileId = requireTenant(user);

    const existing = await this.prisma.customer.findFirst({
      where: { id, companyProfileId },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    // customer_businesses row cascades via Prisma onDelete: Cascade.
    await this.prisma.customer.delete({ where: { id } });
  }
}

function requireTenant(user: AuthUser): string {
  if (!user.companyProfileId) {
    throw new ForbiddenException('User has no tenant scope');
  }
  return user.companyProfileId;
}

/** Remove nested/meta fields so the rest of the DTO can be passed
 *  directly to Prisma customer create/update without type conflicts. */
function stripNestedFields<
  T extends { customerType?: unknown; business?: unknown },
>(dto: T): Omit<T, 'customerType' | 'business'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { customerType: _ct, business: _biz, ...rest } = dto;
  return rest;
}

// Convert empty-string optional fields to null so Postgres stores null uniformly;
// trim non-empty string values. Required fields (fullName, businessName) are
// handled separately by the caller because they cannot be cleared.
function normalizeOptionalFields(dto: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (key === 'fullName' || key === 'businessName') {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      out[key] = trimmed === '' ? null : trimmed;
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
