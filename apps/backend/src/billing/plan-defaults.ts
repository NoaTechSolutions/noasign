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
    contractsEnabled: false,
  },
  STARTER: {
    monthlyReceiptLimit: 20,
    receiptsUnlimited: false,
    receiptOveragePrice: OVERAGE,
    contractsEnabled: true,
  },
  PRO: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractsEnabled: true,
  },
  PAY_PER_CONTRACT: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: false,
    receiptOveragePrice: OVERAGE,
    contractsEnabled: true,
  },
  // Legacy plans (kept, not remapped)
  LAUNCH: {
    monthlyReceiptLimit: 35,
    receiptsUnlimited: false,
    receiptOveragePrice: OVERAGE,
    contractsEnabled: true,
  },
  SCALE: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractsEnabled: true,
  },
  PRO_UNLIMITED: {
    monthlyReceiptLimit: 0,
    receiptsUnlimited: true,
    receiptOveragePrice: OVERAGE,
    contractsEnabled: true,
  },
};

export function getPlanDefaults(plan: PlanName): PlanReceiptDefaults {
  return PLAN_DEFAULTS[plan];
}
