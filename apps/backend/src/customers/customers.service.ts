import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

export type AuthUser = {
  id: string;
  companyProfileId: string | null;
};

export type CustomerListResult = {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateCustomerDto): Promise<Customer> {
    const companyProfileId = requireTenant(user);

    return this.prisma.customer.create({
      data: {
        ...normalizeOptionalFields(dto),
        fullName: dto.fullName.trim(),
        companyProfileId,
        createdByUserId: user.id,
      },
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
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total, limit, offset };
  }

  async findOne(user: AuthUser, id: string) {
    const companyProfileId = requireTenant(user);

    const customer = await this.prisma.customer.findFirst({
      where: { id, companyProfileId },
      include: { _count: { select: { documents: true } } },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<Customer> {
    const companyProfileId = requireTenant(user);

    const existing = await this.prisma.customer.findFirst({
      where: { id, companyProfileId },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const data: Prisma.CustomerUpdateInput = normalizeOptionalFields(dto);
    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName.trim();
    }

    return this.prisma.customer.update({ where: { id }, data });
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    const companyProfileId = requireTenant(user);

    const existing = await this.prisma.customer.findFirst({
      where: { id, companyProfileId },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    await this.prisma.customer.delete({ where: { id } });
  }
}

function requireTenant(user: AuthUser): string {
  if (!user.companyProfileId) {
    throw new ForbiddenException('User has no tenant scope');
  }
  return user.companyProfileId;
}

// Convert empty-string optional fields to null so Postgres stores null uniformly;
// trim non-empty string values. fullName is handled separately by the caller because
// it is required and can't be cleared.
function normalizeOptionalFields(dto: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (key === 'fullName') {
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
