/**
 * Tenant-timezone date helpers. The issue-date feature computes every day boundary
 * (today / future / Jan 1 of the year / the deferred-notify scan) in the tenant's
 * IANA timezone. Because issueDate is a calendar DATE (no time), the whole thing is
 * done by comparing "YYYY-MM-DD" strings rendered in the tenant zone — no date
 * library needed. Kept in sync with the frontend copy at apps/frontend/lib/tenant-date.ts.
 */

/** Fallback used everywhere a tenant has no detected timezone yet (column is NULL). */
export const DEFAULT_TENANT_TZ = 'America/New_York';

/** True when `tz` is a real IANA zone that Intl accepts (rejects garbage input). */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    // Constructing with an invalid timeZone throws a RangeError.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Resolve a usable zone: the tenant's if valid, else the America/New_York fallback. */
export function resolveTenantTz(timezone: string | null | undefined): string {
  return isValidTimeZone(timezone) ? (timezone as string) : DEFAULT_TENANT_TZ;
}

/**
 * The tenant-local calendar date of `at` (default now) as "YYYY-MM-DD". en-CA renders
 * ISO-style year-month-day, so string comparison is chronological.
 */
export function tenantLocalDate(
  timezone: string | null | undefined,
  at: Date = new Date(),
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTenantTz(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** The tenant-local calendar year of `at` (default now). */
export function tenantCurrentYear(
  timezone: string | null | undefined,
  at: Date = new Date(),
): number {
  return Number(tenantLocalDate(timezone, at).slice(0, 4));
}
