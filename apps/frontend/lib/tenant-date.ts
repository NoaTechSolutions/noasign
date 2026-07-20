/**
 * Tenant-timezone date helpers (browser side). Mirrors
 * apps/backend/src/common/tenant-date.ts. issueDate is a calendar date, so every
 * boundary (today / future / Jan 1 of the year) is a "YYYY-MM-DD" string comparison
 * rendered in the tenant zone — no date library needed.
 */

/** Fallback used everywhere a tenant has no detected timezone yet. */
export const DEFAULT_TENANT_TZ = 'America/New_York';

/** True when `tz` is a real IANA zone the browser accepts. */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone this browser is in, or the America/New_York fallback. */
export function detectBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : DEFAULT_TENANT_TZ;
  } catch {
    return DEFAULT_TENANT_TZ;
  }
}

/** Resolve a usable zone: the tenant's if valid, else the fallback. */
export function resolveTenantTz(timezone: string | null | undefined): string {
  return isValidTimeZone(timezone) ? (timezone as string) : DEFAULT_TENANT_TZ;
}

/** Tenant-local calendar date of `at` (default now) as "YYYY-MM-DD". */
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

/** Tenant-local calendar year of `at` (default now). */
export function tenantCurrentYear(
  timezone: string | null | undefined,
  at: Date = new Date(),
): number {
  return Number(tenantLocalDate(timezone, at).slice(0, 4));
}
