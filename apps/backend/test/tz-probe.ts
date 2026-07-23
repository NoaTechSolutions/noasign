/**
 * Server-timezone probe (frente 2). Run as a CHILD process with TZ set at spawn
 * (the only way a Node process reliably adopts a zone — see
 * src/common/tenant-date.spec.ts header). Evaluates the real tenant-date module at
 * fixed instants and prints one JSON line; tenant-date.server-tz.spec.ts spawns it
 * under two different TZs and asserts the outputs are identical and canonical.
 *
 * Invocation: node -r ts-node/register/transpile-only test/tz-probe.ts
 */
import {
  isDueInTenantTz,
  isFutureCalendarDate,
  tenantLocalDate,
  toDateOnly,
} from '../src/common/tenant-date';

const UTC = 'UTC';
const NY = 'America/New_York';
const BA = 'America/Argentina/Buenos_Aires';

const midday = new Date('2026-07-22T12:00:00Z');
const split = new Date('2026-07-23T02:00:00Z'); // Jul 23 in UTC, Jul 22 in NY/BA
const today = { year: 2026, month: 7, day: 22 };
const tomorrow = { year: 2026, month: 7, day: 23 };
const tomorrowColumn = toDateOnly(tomorrow);

const probe = {
  // Proof of which server zone this process ACTUALLY runs in.
  env: {
    tz: process.env.TZ ?? null,
    offsetMinutesJuly: new Date('2026-07-22T12:00:00Z').getTimezoneOffset(),
  },
  // These results must be identical under every server TZ (tenant TZ is canonical).
  results: {
    localDateMidday: {
      utc: tenantLocalDate(UTC, midday),
      ny: tenantLocalDate(NY, midday),
      ba: tenantLocalDate(BA, midday),
    },
    localDateSplit: {
      utc: tenantLocalDate(UTC, split),
      ny: tenantLocalDate(NY, split),
      ba: tenantLocalDate(BA, split),
    },
    todayNotDeferred: {
      utc: isFutureCalendarDate(today, UTC, midday),
      ny: isFutureCalendarDate(today, NY, midday),
      ba: isFutureCalendarDate(today, BA, midday),
    },
    tomorrowDeferred: {
      utc: isFutureCalendarDate(tomorrow, UTC, midday),
      ny: isFutureCalendarDate(tomorrow, NY, midday),
      ba: isFutureCalendarDate(tomorrow, BA, midday),
    },
    // Midnight rollover per tenant zone: [1s before local midnight, at local midnight]
    dueAroundMidnight: {
      utc: [
        isDueInTenantTz(tomorrowColumn, UTC, new Date('2026-07-22T23:59:59Z')),
        isDueInTenantTz(tomorrowColumn, UTC, new Date('2026-07-23T00:00:00Z')),
      ],
      ny: [
        isDueInTenantTz(tomorrowColumn, NY, new Date('2026-07-23T03:59:59Z')),
        isDueInTenantTz(tomorrowColumn, NY, new Date('2026-07-23T04:00:00Z')),
      ],
      ba: [
        isDueInTenantTz(tomorrowColumn, BA, new Date('2026-07-23T02:59:59Z')),
        isDueInTenantTz(tomorrowColumn, BA, new Date('2026-07-23T03:00:00Z')),
      ],
    },
    // Same doc, same instant: due for a UTC tenant, still deferred for a NY tenant.
    splitInstantDue: {
      utc: isDueInTenantTz(tomorrowColumn, UTC, split),
      ny: isDueInTenantTz(tomorrowColumn, NY, split),
    },
  },
};

process.stdout.write(JSON.stringify(probe));
