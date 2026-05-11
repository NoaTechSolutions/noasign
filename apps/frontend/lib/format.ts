/**
 * Formatting utilities for NTSsign.
 * Centralized formatters used across the application.
 *
 * FASE 3.5 — moved from `components/dashboard-sidebar-demo.tsx` (and
 * `dashboard/panels/billing-panel.tsx` + `dashboard/panels/dashboard-overview-panel.tsx`
 * for the billing-month formatters). Implementations are byte-for-byte copies
 * of the originals — do not modify logic here without checking call sites.
 */

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBillingMonthLabel(billingPeriod?: string) {
  if (!billingPeriod) return "Unknown month";
  const [year, month] = billingPeriod.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return billingPeriod;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

export function formatBillingMonthShort(billingPeriod?: string) {
  if (!billingPeriod) return "Mon";
  const [year, month] = billingPeriod.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return "Mon";
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

export function formatCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return "";

  const [wholePart = "", ...decimalParts] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "") || wholePart || "0";
  const joinedDecimal = decimalParts.join("").slice(0, 2);

  if (normalized.includes(".")) {
    return `${whole}.${joinedDecimal}`;
  }

  return whole;
}

export function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function joinDefined(values: Array<string | null | undefined>, separator: string) {
  return values.filter((value): value is string => Boolean(value && value.trim())).join(separator);
}

export function getCompanyInitials(companyName?: string | null) {
  if (!companyName) return "NS";
  const words = companyName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return "NS";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}
