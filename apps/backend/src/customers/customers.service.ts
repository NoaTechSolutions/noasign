import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Customer,
  CustomerBusiness,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

export type AuthUser = {
  id: string;
  role: UserRole;
  companyProfileId: string | null;
};

export type CustomerOwnerSnapshot = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type CustomerWithCount = Customer & {
  _count: { documents: number };
  business: CustomerBusiness | null;
  user?: CustomerOwnerSnapshot;
};

export type CustomerListResult = {
  customers: CustomerWithCount[];
  total: number;
  limit: number;
  offset: number;
};

// Same shape included on every customer read — used by the master view to
// show "Owner: …" without a separate request.
const ownerInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

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

    // Resolve ownership: master may assign via dto.userId (validated to live
    // in the same tenant); non-master users always own what they create,
    // even if dto.userId tries to say otherwise.
    const ownerUserId = await this.resolveOwnerForCreate(
      user,
      companyProfileId,
      dto.userId,
    );

    const customerData = normalizeOptionalFields(stripNestedFields(dto));

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ...customerData,
          fullName: dto.fullName.trim(),
          customerType,
          companyProfileId,
          userId: ownerUserId,
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
          ...ownerInclude,
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

    const where: Prisma.CustomerWhereInput = {
      companyProfileId,
      // `status` is the source of truth for the delete state. Non-master users
      // never receive DELETED clients; master receives every status and the
      // frontend filters client-side (hiding DELETED unless explicitly filtered).
      ...(user.role === 'SUPERADMIN' ? {} : { status: { not: 'DELETED' } }),
      ...buildOwnershipFilter(user, query.userId),
    };

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
          ...ownerInclude,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total, limit, offset };
  }

  async findOne(user: AuthUser, id: string) {
    const companyProfileId = requireTenant(user);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyProfileId,
        deletedAt: null,
        ...buildOwnershipFilter(user),
      },
      include: {
        _count: { select: { documents: true } },
        business: true,
        ...ownerInclude,
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
      where: {
        id,
        companyProfileId,
        ...buildOwnershipFilter(user),
      },
      include: { business: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    // Non-master users can neither see nor touch DELETED clients — editing one
    // (or restoring it out of DELETED via a status change) is master-only.
    if (existing.status === 'DELETED' && user.role !== 'SUPERADMIN') {
      throw new NotFoundException('Customer not found');
    }

    // Reassignment: master only. Non-master attempts to change userId are
    // ignored silently (the field stays as-is) — the DTO is permissive on
    // shape, the service is the gate.
    let nextOwnerUserId: string | undefined;
    if (dto.userId !== undefined) {
      if (user.role !== 'SUPERADMIN') {
        throw new ForbiddenException(
          'Only master users can reassign customer ownership',
        );
      }
      await this.assertUserInTenant(dto.userId, companyProfileId);
      nextOwnerUserId = dto.userId;
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
    if (nextOwnerUserId !== undefined) {
      customerData.user = { connect: { id: nextOwnerUserId } };
    }

    // Status is the source of truth for the delete state; keep deletedAt (audit)
    // in sync on an actual transition. → DELETED stamps it; → ACTIVE/INACTIVE
    // (i.e. a restore) clears it.
    if (dto.status !== undefined && dto.status !== existing.status) {
      customerData.deletedAt = dto.status === 'DELETED' ? new Date() : null;
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
          ...ownerInclude,
        },
      });
    });
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    const companyProfileId = requireTenant(user);

    const existing = await this.prisma.customer.findFirst({
      where: {
        id,
        companyProfileId,
        status: { not: 'DELETED' },
        ...buildOwnershipFilter(user),
      },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    // Soft delete via status. `deletedAt` is kept as an audit trail (when it was
    // deleted) but `status` is what the queries filter on. SUPERADMIN can restore
    // later via POST /customers/:id/restore. Hard delete is no longer exposed.
    await this.prisma.customer.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }

  async restore(user: AuthUser, id: string) {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Only master users can restore customers');
    }
    const companyProfileId = requireTenant(user);

    const existing = await this.prisma.customer.findFirst({
      where: { id, companyProfileId, status: 'DELETED' },
    });

    if (!existing) {
      throw new NotFoundException('Deleted customer not found');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { status: 'ACTIVE', deletedAt: null },
    });

    return this.prisma.customer.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { documents: true } },
        business: true,
        ...ownerInclude,
      },
    });
  }

  async listDeleted(
    user: AuthUser,
    query: ListCustomersQueryDto,
  ): Promise<CustomerListResult> {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Only master users can list deleted customers');
    }
    const companyProfileId = requireTenant(user);

    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const orderByField = query.orderBy ?? 'createdAt';
    const orderDir = query.orderDir ?? 'desc';

    const where: Prisma.CustomerWhereInput = {
      companyProfileId,
      status: 'DELETED',
    };

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
          ...ownerInclude,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total, limit, offset };
  }

  private async resolveOwnerForCreate(
    user: AuthUser,
    companyProfileId: string,
    requested: string | undefined,
  ): Promise<string> {
    // Non-master: forced to self regardless of payload.
    if (user.role !== 'SUPERADMIN') {
      return user.id;
    }
    // Master with explicit assignment: validate target lives in the same
    // tenant before accepting it.
    if (requested && requested !== user.id) {
      await this.assertUserInTenant(requested, companyProfileId);
      return requested;
    }
    // Master without explicit assignment: own the row themselves.
    return user.id;
  }

  private async assertUserInTenant(
    targetUserId: string,
    companyProfileId: string,
  ): Promise<void> {
    const found = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyProfileId },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException(
        'Target user not found in the current tenant',
      );
    }
  }
}

function requireTenant(user: AuthUser): string {
  if (!user.companyProfileId) {
    throw new ForbiddenException('User has no tenant scope');
  }
  return user.companyProfileId;
}

/** Per-user ownership filter for list/find/update/delete reads.
 *
 * - Non-master: always pinned to user.id (privacy guarantee — they can't
 *   ever see another teammate's customers).
 * - Master with `queryUserId` (from list filter): can scope to any user
 *   ('me' resolves to their own id, otherwise the literal id is used).
 *   Cross-tenant filtering still impossible because companyProfileId is
 *   AND-ed alongside.
 * - Master without `queryUserId`: no extra filter — sees the whole tenant.
 */
function buildOwnershipFilter(
  user: AuthUser,
  queryUserId?: string,
): Prisma.CustomerWhereInput {
  if (user.role !== 'SUPERADMIN') {
    return { userId: user.id };
  }
  const requested = queryUserId?.trim();
  if (!requested) return {};
  if (requested === 'me') return { userId: user.id };
  return { userId: requested };
}

/** Remove nested/meta fields so the rest of the DTO can be passed
 *  directly to Prisma customer create/update without type conflicts. */
function stripNestedFields<
  T extends {
    customerType?: unknown;
    business?: unknown;
    userId?: unknown;
  },
>(dto: T): Omit<T, 'customerType' | 'business' | 'userId'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { customerType: _ct, business: _biz, userId: _uid, ...rest } = dto;
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
