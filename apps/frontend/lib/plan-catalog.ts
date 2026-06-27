/**
 * Single source of truth for plan data on the frontend.
 *
 * Values derive from docs/product/pricing-canonical.md (the canonical pricing
 * spec, 2026-04-10). Both the billing view (getBillingPlanConfig in the
 * dashboard) and the compare-plans modal read from here — do NOT re-hardcode
 * plan numbers elsewhere.
 *
 * `null` on a limit means "unlimited". The contract dimensions (docs/users/
 * templates/overage) live here; the receipt dimension (Model C) is per-tenant
 * and comes from the backend getCurrentUsage, not this catalog.
 */

export type PlanId =
  | 'PAY_PER_CONTRACT'
  | 'STARTER'
  | 'LAUNCH'
  | 'PRO'
  | 'SCALE'
  | 'PRO_UNLIMITED'
  | 'RECEIPTS_ONLY';

export interface PlanFeatures {
  userManagement: boolean;
  multiSigner: boolean;
  autoReminders: boolean;
  branding: boolean;
  bulkSend: boolean;
  analytics: boolean;
  prioritySupport: boolean;
}

export interface PlanCatalogEntry {
  id: PlanId;
  name: string;
  /** Monthly price (USD). For PAY_PER_CONTRACT this is the per-document price. */
  price: number;
  /** Effective monthly price when billed annually; null when N/A. */
  priceAnnualMo: number | null;
  /** Contract documents per month; null = unlimited. */
  docsLimit: number | null;
  /** Seats; null = unlimited. */
  usersLimit: number | null;
  /** Active templates; null = unlimited. */
  templatesLimit: number | null;
  /** Per-document overage price (USD). */
  overageRate: number;
  /** Document retention window, human-readable. */
  retention: string;
  features: PlanFeatures;
  /** RECEIPTS_ONLY renders a dedicated card (no contract dimensions). */
  receiptsOnly?: boolean;
  /**
   * Not part of the public lineup — excluded from the upgrade/compare selector.
   * PAY_PER_CONTRACT (no billing UI) and PRO_UNLIMITED (legacy internal override,
   * e.g. worldpaversco) are present so the current-plan view resolves correctly,
   * but are never offered as an upgrade option.
   */
  internal?: boolean;
}

const NO_FEATURES: PlanFeatures = {
  userManagement: false,
  multiSigner: false,
  autoReminders: false,
  branding: false,
  bulkSend: false,
  analytics: false,
  prioritySupport: false,
};

export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  PAY_PER_CONTRACT: {
    id: 'PAY_PER_CONTRACT',
    name: 'Pay-per-contract',
    price: 12, // per document, not monthly
    priceAnnualMo: null,
    docsLimit: 0,
    usersLimit: 1,
    templatesLimit: 0,
    overageRate: 12,
    retention: '90 days',
    features: { ...NO_FEATURES },
    internal: true, // no dashboard billing UI
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 19,
    priceAnnualMo: 16,
    docsLimit: 5,
    usersLimit: 1,
    templatesLimit: 1,
    overageRate: 4,
    retention: '1 year',
    features: { ...NO_FEATURES, autoReminders: true },
  },
  LAUNCH: {
    id: 'LAUNCH',
    name: 'Launch',
    price: 39,
    priceAnnualMo: 32,
    docsLimit: 15,
    usersLimit: 2,
    templatesLimit: 3,
    overageRate: 3.5,
    retention: '2 years',
    features: {
      ...NO_FEATURES,
      userManagement: true,
      multiSigner: true,
      autoReminders: true,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    price: 89,
    priceAnnualMo: 74,
    docsLimit: 50,
    usersLimit: 5,
    templatesLimit: 10,
    overageRate: 2.5,
    retention: '3 years',
    features: {
      userManagement: true,
      multiSigner: true,
      autoReminders: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: false,
    },
  },
  SCALE: {
    id: 'SCALE',
    name: 'Scale',
    price: 229,
    priceAnnualMo: 190,
    docsLimit: 150,
    usersLimit: 15,
    templatesLimit: null, // unlimited
    overageRate: 1.5,
    retention: '5 years',
    features: {
      userManagement: true,
      multiSigner: true,
      autoReminders: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: true,
    },
  },
  // Legacy internal override (e.g. worldpaversco) — everything unlimited. Kept so
  // the billing view resolves its name/limits correctly; never publicly offered.
  PRO_UNLIMITED: {
    id: 'PRO_UNLIMITED',
    name: 'Pro Unlimited',
    price: 89,
    priceAnnualMo: null,
    docsLimit: null, // unlimited
    usersLimit: null, // unlimited
    templatesLimit: null, // unlimited
    overageRate: 0,
    retention: '5 years',
    features: {
      userManagement: true,
      multiSigner: true,
      autoReminders: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: true,
    },
    internal: true,
  },
  // Model C — receipts-only plan. Owner-set: $19/mo, unlimited receipts, no
  // contracts. Contract dimensions are 0; receipts come from getCurrentUsage.
  RECEIPTS_ONLY: {
    id: 'RECEIPTS_ONLY',
    name: 'Receipts Plan',
    price: 19,
    priceAnnualMo: null,
    docsLimit: 0,
    usersLimit: 1,
    templatesLimit: 0,
    overageRate: 0,
    retention: '1 year',
    features: { ...NO_FEATURES },
    receiptsOnly: true,
  },
};

/** Plans offered in the public upgrade/compare selector, in display order. */
export const PUBLIC_PLAN_ORDER: PlanId[] = ['STARTER', 'LAUNCH', 'PRO', 'SCALE'];

/**
 * Resolve a plan entry by name (case-insensitive). Falls back to LAUNCH — the
 * sales target plan — for unknown/missing values, matching the previous
 * getBillingPlanConfig behaviour.
 */
export function getPlanEntry(planName: string | null | undefined): PlanCatalogEntry {
  const key = (planName ?? 'LAUNCH').toUpperCase() as PlanId;
  return PLAN_CATALOG[key] ?? PLAN_CATALOG.LAUNCH;
}

/** Render a limit for display: a number, or "Unlimited" when null. */
export function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : String(value);
}

/** The glyph shown for an unlimited usage card (recibos or contratos). */
export const UNLIMITED_GLYPH = '∞';

/**
 * Usage value for a "this month" card: the infinity glyph when the limit is
 * unlimited (null) — never "0 / 0" — else "used / limit". One shared helper so
 * every usage card (receipts and contracts) renders unlimited the same way.
 */
export function formatUsage(used: number, limit: number | null): string {
  return limit === null ? UNLIMITED_GLYPH : `${used} / ${limit}`;
}
