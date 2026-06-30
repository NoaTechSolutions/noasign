import { PlanName } from '@prisma/client';
import { PLAN_DEFAULTS, getPlanDefaults } from './plan-defaults';

describe('PLAN_DEFAULTS (Model C receipt billing)', () => {
  it('covers every PlanName enum value', () => {
    for (const plan of Object.values(PlanName)) {
      expect(PLAN_DEFAULTS[plan]).toBeDefined();
    }
  });

  it('RECEIPTS_ONLY: unlimited receipts, contracts disabled', () => {
    const d = PLAN_DEFAULTS.RECEIPTS_ONLY;
    expect(d.receiptsUnlimited).toBe(true);
    expect(d.contractsEnabled).toBe(false);
  });

  it('STARTER: 20 receipts, contracts enabled, not unlimited', () => {
    const d = PLAN_DEFAULTS.STARTER;
    expect(d.monthlyReceiptLimit).toBe(20);
    expect(d.receiptsUnlimited).toBe(false);
    expect(d.contractsEnabled).toBe(true);
  });

  it('LAUNCH: 35 receipts, not unlimited', () => {
    const d = PLAN_DEFAULTS.LAUNCH;
    expect(d.monthlyReceiptLimit).toBe(35);
    expect(d.receiptsUnlimited).toBe(false);
  });

  it('PRO and SCALE: unlimited receipts', () => {
    expect(PLAN_DEFAULTS.PRO.receiptsUnlimited).toBe(true);
    expect(PLAN_DEFAULTS.SCALE.receiptsUnlimited).toBe(true);
  });

  it('legacy PRO_UNLIMITED: unlimited receipts (kept, not remapped)', () => {
    expect(PLAN_DEFAULTS.PRO_UNLIMITED.receiptsUnlimited).toBe(true);
  });

  it('PAY_PER_CONTRACT: limit 0 + overage, not unlimited (pure pay-as-you-go)', () => {
    const d = PLAN_DEFAULTS.PAY_PER_CONTRACT;
    expect(d.monthlyReceiptLimit).toBe(0);
    expect(d.receiptsUnlimited).toBe(false);
    expect(d.receiptOveragePrice).toBe(0.25);
  });

  it('overage price is $0.25 for the metered plans', () => {
    for (const plan of [
      'STARTER',
      'LAUNCH',
      'PAY_PER_CONTRACT',
    ] as PlanName[]) {
      expect(PLAN_DEFAULTS[plan].receiptOveragePrice).toBe(0.25);
    }
  });

  it('getPlanDefaults returns the entry for a known plan', () => {
    expect(getPlanDefaults(PlanName.STARTER)).toEqual(PLAN_DEFAULTS.STARTER);
  });
});
