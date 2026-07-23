/**
 * Timezone characterization suite for the tenant-date helpers (frente 2 de la FECHA).
 *
 * Canonical semantics under test (defined by tenant-date.ts + DeferredNotifyService):
 *   - Every "today / future / due" decision is made in the TENANT's IANA timezone
 *     (an explicit `timeZone` is always passed to Intl), so the SERVER's timezone
 *     must be completely irrelevant to the result.
 *   - "Deferred" (Scheduled) = calendar issue date strictly AFTER the tenant-local
 *     today; "due" = issue date <= tenant-local today. The flip happens exactly at
 *     the tenant's local midnight — never the server's.
 *   - A tenant without a valid timezone falls back to America/New_York.
 *
 * Every assertion here pins the instant (`at`) explicitly, so the expectations are
 * absolute regardless of the machine's zone. The companion spec
 * tenant-date.server-tz.spec.ts re-runs the same probes in REAL child processes
 * under two different server TZs (UTC and Buenos Aires) to prove server-TZ
 * independence for real. (Assigning process.env.TZ inside a Jest test file does NOT
 * work: Jest sandboxes process.env as a plain copy, so Node's setter hook that
 * invalidates V8's cached zone never fires — hence the child processes.)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { DeferredNotifyService } from '../notifications/deferred-notify.service';
import {
  DEFAULT_TENANT_TZ,
  isDueInTenantTz,
  isFutureCalendarDate,
  resolveTenantTz,
  tenantLocalDate,
  toDateOnly,
} from './tenant-date';

const UTC = 'UTC';
const NY = 'America/New_York'; // July = EDT (UTC-4), January = EST (UTC-5)
const BA = 'America/Argentina/Buenos_Aires'; // UTC-3, no DST

describe('tenant-date — tenant-timezone date semantics', () => {
  describe('tenantLocalDate — the tenant zone decides the calendar day, not the server', () => {
    it('a midday instant is the same calendar day in every tenant zone', () => {
      const at = new Date('2026-07-22T12:00:00Z');
      expect(tenantLocalDate(UTC, at)).toBe('2026-07-22');
      expect(tenantLocalDate(NY, at)).toBe('2026-07-22');
      expect(tenantLocalDate(BA, at)).toBe('2026-07-22');
    });

    it('a split instant (02:00Z) is already "tomorrow" in UTC but still "today" in NY and BA', () => {
      const at = new Date('2026-07-23T02:00:00Z');
      expect(tenantLocalDate(UTC, at)).toBe('2026-07-23');
      expect(tenantLocalDate(NY, at)).toBe('2026-07-22'); // 22:00 EDT
      expect(tenantLocalDate(BA, at)).toBe('2026-07-22'); // 23:00 ART
    });

    it('is DST-aware: New York in January uses EST (UTC-5)', () => {
      const winter = new Date('2026-01-15T04:30:00Z'); // 23:30 Jan 14 EST
      expect(tenantLocalDate(NY, winter)).toBe('2026-01-14');
      const summer = new Date('2026-07-15T04:30:00Z'); // 00:30 Jul 15 EDT
      expect(tenantLocalDate(NY, summer)).toBe('2026-07-15');
    });

    it('null/invalid tenant timezone falls back to America/New_York', () => {
      const at = new Date('2026-07-23T02:00:00Z');
      expect(resolveTenantTz(null)).toBe(DEFAULT_TENANT_TZ);
      expect(resolveTenantTz('Not/AZone')).toBe(DEFAULT_TENANT_TZ);
      expect(tenantLocalDate(null, at)).toBe('2026-07-22'); // NY behavior
      expect(tenantLocalDate('Not/AZone', at)).toBe(tenantLocalDate(NY, at));
    });
  });

  describe('isFutureCalendarDate / isDueInTenantTz — today vs tomorrow', () => {
    const at = new Date('2026-07-22T12:00:00Z'); // midday: same day everywhere
    const today = { year: 2026, month: 7, day: 22 };
    const tomorrow = { year: 2026, month: 7, day: 23 };

    it.each([UTC, NY, BA])(
      '(a) a doc dated today is NOT deferred and IS due (tenant %s)',
      (tz) => {
        expect(isFutureCalendarDate(today, tz, at)).toBe(false);
        expect(isDueInTenantTz(toDateOnly(today), tz, at)).toBe(true);
      },
    );

    it.each([UTC, NY, BA])(
      '(b) a doc dated tomorrow IS deferred and NOT due (tenant %s)',
      (tz) => {
        expect(isFutureCalendarDate(tomorrow, tz, at)).toBe(true);
        expect(isDueInTenantTz(toDateOnly(tomorrow), tz, at)).toBe(false);
      },
    );

    it('accepts the @db.Date UTC-midnight Date and its ISO string equivalently', () => {
      const asColumn = toDateOnly(today); // 2026-07-22T00:00:00.000Z
      expect(asColumn.toISOString()).toBe('2026-07-22T00:00:00.000Z');
      expect(isDueInTenantTz(asColumn, NY, at)).toBe(
        isDueInTenantTz('2026-07-22', NY, at),
      );
      expect(isDueInTenantTz(null, NY, at)).toBe(false);
    });
  });

  describe('(c) midnight rollover — the flip happens at the TENANT local midnight', () => {
    const doc = { year: 2026, month: 7, day: 23 };
    const column = toDateOnly(doc);

    // [tenant tz, one second before its local midnight, its local midnight]
    const boundaries: Array<[string, string, string]> = [
      [UTC, '2026-07-22T23:59:59Z', '2026-07-23T00:00:00Z'],
      [NY, '2026-07-23T03:59:59Z', '2026-07-23T04:00:00Z'], // EDT = UTC-4
      [BA, '2026-07-23T02:59:59Z', '2026-07-23T03:00:00Z'], // ART = UTC-3
    ];

    it.each(boundaries)(
      'tenant %s: 1s before local midnight the doc is still deferred; at midnight it is due',
      (tz, beforeIso, midnightIso) => {
        const before = new Date(beforeIso);
        const midnight = new Date(midnightIso);

        expect(isFutureCalendarDate(doc, tz, before)).toBe(true);
        expect(isDueInTenantTz(column, tz, before)).toBe(false);

        expect(isFutureCalendarDate(doc, tz, midnight)).toBe(false);
        expect(isDueInTenantTz(column, tz, midnight)).toBe(true);
      },
    );
  });

  describe('(d) same instant, different tenant zones — tenant TZ is authoritative', () => {
    // 02:00Z on Jul 23: already Jul 23 for a UTC tenant, still Jul 22 (22:00) in NY.
    const at = new Date('2026-07-23T02:00:00Z');
    const doc = { year: 2026, month: 7, day: 23 };
    const column = toDateOnly(doc);

    it('the SAME doc at the SAME instant is due for a UTC tenant but still deferred for a NY tenant', () => {
      expect(isDueInTenantTz(column, UTC, at)).toBe(true);
      expect(isFutureCalendarDate(doc, UTC, at)).toBe(false);

      expect(isDueInTenantTz(column, NY, at)).toBe(false);
      expect(isFutureCalendarDate(doc, NY, at)).toBe(true);
    });
  });

  describe('DeferredNotifyService at the boundary — per-tenant midnight, not server midnight', () => {
    const prismaMock = {
      document: { findMany: jest.fn(), update: jest.fn() },
    };
    const notificationsMock = { notify: jest.fn() };
    let service: DeferredNotifyService;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeferredNotifyService,
          { provide: PrismaService, useValue: prismaMock },
          { provide: NotificationService, useValue: notificationsMock },
        ],
      }).compile();
      service = module.get<DeferredNotifyService>(DeferredNotifyService);
    });

    it('at 02:00Z notifies only the tenant whose local midnight already passed', async () => {
      const issueDate = toDateOnly({ year: 2026, month: 7, day: 23 });
      prismaMock.document.findMany.mockResolvedValue([
        {
          id: 'utc-doc',
          userId: 'u-utc',
          documentNumber: 'REC-2026-0001',
          issueDate,
          companyProfile: { timezone: UTC },
          documentType: { code: 'PAYMENT_RECEIPT' },
        },
        {
          id: 'ny-doc',
          userId: 'u-ny',
          documentNumber: 'REC-2026-0002',
          issueDate,
          companyProfile: { timezone: NY },
          documentType: { code: 'PAYMENT_RECEIPT' },
        },
      ]);

      const notified = await service.scanDueDeferredDocuments(
        new Date('2026-07-23T02:00:00Z'),
      );

      expect(notified).toBe(1);
      expect(notificationsMock.notify).toHaveBeenCalledTimes(1);
      expect(notificationsMock.notify).toHaveBeenCalledWith(
        'u-utc',
        expect.objectContaining({ documentId: 'utc-doc' }),
      );
      expect(prismaMock.document.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'utc-doc' } }),
      );
    });

    it('two hours later (04:00Z = NY midnight) the NY tenant becomes due as well', async () => {
      const issueDate = toDateOnly({ year: 2026, month: 7, day: 23 });
      prismaMock.document.findMany.mockResolvedValue([
        {
          id: 'ny-doc',
          userId: 'u-ny',
          documentNumber: 'REC-2026-0002',
          issueDate,
          companyProfile: { timezone: NY },
          documentType: { code: 'PAYMENT_RECEIPT' },
        },
      ]);

      const notified = await service.scanDueDeferredDocuments(
        new Date('2026-07-23T04:00:00Z'),
      );

      expect(notified).toBe(1);
      expect(notificationsMock.notify).toHaveBeenCalledWith(
        'u-ny',
        expect.objectContaining({ documentId: 'ny-doc' }),
      );
    });
  });
});
