import { PlanName } from '@prisma/client';

/**
 * Model C — per-plan receipt-billing defaults.
 *
 * Single source of truth used ONLY when a plan is assigned to a tenant (to seed
 * the CompanyProfile fields). Enforcement reads the per-tenant CompanyProfile
 * fields directly, NOT this map — so manual overrides (e.g. worldpaversco)
 * survive. Additive: legacy LAUNCH/SCALE/PRO_UNLIMITED are kept, not remapped.
 */
export interface PlanReceiptDefaults {
  /** Receipts included per month. Ignored when receiptsUnlimited is true. */
  monthlyReceiptLimit: number;
  /** True for PRO/SCALE/RECEIPTS_ONLY (and legacy PRO_UNLIMITED). */
  receiptsUnlimited: boolean;
  /** Price per receipt over the monthly limit (Starter/Launch/PPC). */
  receiptOveragePrice: number;
  /**
   * Price per CONTRACT document over the monthly limit. Canonical per-plan
   * pricing (mirrors the frontend plan-catalog `overageRate` and
   * docs/product/pricing-canonical.md). 0 for unlimited / receipts-only.
   * This is now the authoritative source the plan-assignment script seeds from,
   * replacing the misleading CompanyProfile.overagePrice $5 schema default.
   */
  contractOveragePrice: number;
  /** False for RECEIPTS_ONLY (receipts-only plan cannot create contracts). */
  contractsEnabled: boolean;
}

const OVERAGE = 0.25;

export const PLAN_DEFAULTS: Record<PlanName, PlanReceiptDefaults> = {
  // Model C plans
  RECEIPTS_ONLY: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 0,
    contractsEnabled: false,
  },
  STARTER: {
    monthlyReceiptLimit: 20,
    receiptsUnlimited: false,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 4,
    contractsEnabled: true,
  },
  PRO: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 2.5,
    contractsEnabled: true,
  },
  PAY_PER_CONTRACT: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: false,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 12,
    contractsEnabled: true,
  },
  // Legacy plans (kept, not remapped)
  LAUNCH: {
    monthlyReceiptLimit: 35,
    receiptsUnlimited: false,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 3.5,
    contractsEnabled: true,
  },
  SCALE: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 1.5,
    contractsEnabled: true,
  },
  PRO_UNLIMITED: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractOveragePrice: 0,
    contractsEnabled: true,
  },
};

export function getPlanDefaults(plan: PlanName): PlanReceiptDefaults {
  return PLAN_DEFAULTS[plan];
}
