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

export interface CalendarParts {
  year: number;
  month: number;
  day: number;
}

/** Parse "YYYY-MM-DD" (date input) or "MM/DD/YYYY" (US receipt format) into calendar
 *  parts. Returns null for anything unrecognized. */
export function parseCalendarDate(
  value: string | null | undefined,
): CalendarParts | null {
  if (!value) return null;
  const s = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return { year: +iso[1], month: +iso[2], day: +iso[3] };
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (us) return { year: +us[3], month: +us[1], day: +us[2] };
  return null;
}

/** Build a @db.Date column value (UTC midnight) from calendar parts — no TZ drift,
 *  since a DATE column stores only the calendar day. */
export function toDateOnly(parts: CalendarParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/** Calendar parts as "YYYY-MM-DD". */
export function formatCalendarParts(parts: CalendarParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
    parts.day,
  ).padStart(2, '0')}`;
}

/** True when the calendar date is strictly AFTER the tenant's local today. */
export function isFutureCalendarDate(
  parts: CalendarParts,
  timezone: string | null | undefined,
  at: Date = new Date(),
): boolean {
  return formatCalendarParts(parts) > tenantLocalDate(timezone, at);
}

/** True when a stored @db.Date (or ISO string) has reached / passed the tenant's
 *  local today (i.e. issueDate <= today). Used by the deferred-notify scan. */
export function isDueInTenantTz(
  issueDate: Date | string | null | undefined,
  timezone: string | null | undefined,
  at: Date = new Date(),
): boolean {
  if (!issueDate) return false;
  // A @db.Date comes back as UTC midnight; take its calendar day directly.
  const iso =
    typeof issueDate === 'string'
      ? issueDate.slice(0, 10)
      : issueDate.toISOString().slice(0, 10);
  return iso <= tenantLocalDate(timezone, at);
}
