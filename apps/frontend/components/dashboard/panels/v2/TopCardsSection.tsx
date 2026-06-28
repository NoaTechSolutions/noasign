'use client';

import React from 'react';
import { CreditCard, Calendar } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / msPerDay));
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── mini plan data (for the desktop plan row) ──────────────────────────────

const MINI_PLANS: { id: string; name: string; price: number }[] = [
  { id: 'STARTER', name: 'Starter', price: 19 },
  { id: 'LAUNCH',  name: 'Launch',  price: 39 },
  { id: 'PRO',     name: 'Pro',     price: 89 },
  { id: 'SCALE',   name: 'Scale',   price: 229 },
];

const MAX_PLAN_IDS = ['SCALE', 'ENTERPRISE'];

// ─── interfaces ─────────────────────────────────────────────────────────────

interface TopCardsSectionProps {
  currentPlan: {
    name: string;
    plan: string;
    price: number;
    documentsLimit: number | null; // null = unlimited
    overageRate: number;
  };
  cycle: {
    nextBilling: string;
  };
  usage: {
    documents: number;
    overageCount: number;
  };
  role: 'master' | 'admin' | 'user';
  // Receipts-only tenants (contractsEnabled === false) hide the doc-usage stats.
  contractsEnabled: boolean;
  // Receipts emitted this cycle — shown in place of "Docs used" for receipts-only.
  receiptsThisCycle?: number;
  onChangePlan: () => void;
}

// ─── Card 1 — Current Plan ───────────────────────────────────────────────────

export function CurrentPlanCard({
  currentPlan,
  cycle,
  usage,
  role,
  contractsEnabled,
  receiptsThisCycle = 0,
  onChangePlan,
}: TopCardsSectionProps) {
  const docsUsed = usage.documents;
  const docsLimit = currentPlan.documentsLimit;
  const docsLimitLabel = docsLimit === null ? '∞' : docsLimit;
  const progressPct =
    docsLimit !== null && docsLimit > 0
      ? Math.min(100, Math.round((docsUsed / docsLimit) * 100))
      : 0;
  const daysLeft = daysUntil(cycle.nextBilling);
  const isMaxPlan = MAX_PLAN_IDS.includes(currentPlan.plan.toUpperCase());
  const showUpgrade = !isMaxPlan;

  return (
    <div className="bill-card2">
      {/* header */}
      <div className="bill-card2__head">
        <span className="bill-card2__head-icon">
          <CreditCard size={16} />
        </span>
        <span className="bill-card2__head-label">Current plan</span>
        <span className="billing-badge-active">Active</span>
      </div>

      {/* plan name + price */}
      <div className="bill-card2__name-row">
        <span className="bill-card2__plan-name">{currentPlan.name}</span>
        <span className="bill-card2__plan-price">
          ${currentPlan.price}
          <span className="bill-card2__plan-per">/mo</span>
        </span>
      </div>
      <p className="bill-card2__annual-hint">
        Save ~17% → ${Math.round(currentPlan.price * 12 * 0.83 / 12)}/mo billed annually
      </p>

      {/* stat boxes — docs usage for contract plans, receipts for receipts-only */}
      <div className="billing-stat-boxes">
        {/* docs used (contracts) */}
        {contractsEnabled && (
          <div className="billing-stat-box">
            <span className="billing-stat-box__label">Docs used</span>
            <span className="billing-stat-box__value">
              {docsUsed}/{docsLimitLabel}
            </span>
            <div className="billing-progress-track">
              <div
                className="billing-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* receipts this cycle (receipts-only) */}
        {!contractsEnabled && (
          <div className="billing-stat-box">
            <span className="billing-stat-box__label">Receipts this cycle</span>
            <span className="billing-stat-box__value">{receiptsThisCycle}</span>
          </div>
        )}

        {/* renews */}
        <div className="billing-stat-box">
          <span className="billing-stat-box__label">Renews</span>
          <span className="billing-stat-box__value">
            {formatDate(cycle.nextBilling)}
          </span>
          <span className="billing-stat-box__sub">{daysLeft} days left</span>
        </div>
      </div>

      {/* mini plan cards — desktop only */}
      <div className="billing-mini-plans">
        {MINI_PLANS.map((p) => (
          <div
            key={p.id}
            className={`billing-mini-plan${p.id === currentPlan.plan.toUpperCase() ? ' billing-mini-plan--current' : ''}`}
          >
            <span className="billing-mini-plan__name">{p.name}</span>
            <span className="billing-mini-plan__price">${p.price}/mo</span>
          </div>
        ))}
      </div>

      {/* upgrade button */}
      {showUpgrade && (
        <button
          type="button"
          className="btn-upgrade-plan"
          onClick={onChangePlan}
        >
          Upgrade plan ↗
        </button>
      )}
    </div>
  );
}

// ─── Card 2 — Billing Cycle ──────────────────────────────────────────────────

interface BillingCycleCardProps {
  currentPlan: {
    documentsLimit: number | null; // null = unlimited
    overageRate: number;
    price: number;
  };
  cycle: {
    nextBilling: string;
  };
  usage: {
    documents: number;
    overageCount: number;
  };
  contractsEnabled: boolean;
}

export function BillingCycleCard({ currentPlan, cycle, usage, contractsEnabled }: BillingCycleCardProps) {
  const cycleTotal = currentPlan.price + usage.overageCount * currentPlan.overageRate;
  const docsUsed = usage.documents;
  const docsLimit = currentPlan.documentsLimit;
  const docsLimitLabel = docsLimit === null ? '∞' : docsLimit;
  const progressPct =
    docsLimit !== null && docsLimit > 0
      ? Math.min(100, Math.round((docsUsed / docsLimit) * 100))
      : 0;

  return (
    <div className="bill-card2">
      {/* header */}
      <div className="bill-card2__head">
        <span className="bill-card2__head-icon">
          <Calendar size={16} />
        </span>
        <span className="bill-card2__head-label">Billing cycle</span>
      </div>

      {/* Desktop / tablet: 2×2 grid */}
      <div className="billing-cycle-grid">
        {/* docs used + progress — contracts only */}
        {contractsEnabled && (
          <div className="billing-cycle-cell">
            <span className="billing-cycle-cell__label">Documents used</span>
            <span className="billing-cycle-cell__value">{docsUsed}/{docsLimitLabel}</span>
            <div className="billing-progress-track billing-progress-track--sm">
              <div
                className="billing-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* renews date */}
        <div className="billing-cycle-cell">
          <span className="billing-cycle-cell__label">Renews</span>
          <span className="billing-cycle-cell__value billing-cycle-cell__value--sky">
            {formatDate(cycle.nextBilling)}
          </span>
        </div>

        {/* overage rate — contracts only */}
        {contractsEnabled && (
          <div className="billing-cycle-cell billing-cycle-cell--border-top">
            <span className="billing-cycle-cell__label">Overage rate</span>
            <span className="billing-cycle-cell__value billing-cycle-cell__value--sky">
              ${currentPlan.overageRate.toFixed(2)}/doc
            </span>
          </div>
        )}

        {/* cycle total */}
        <div className="billing-cycle-cell billing-cycle-cell--border-top">
          <span className="billing-cycle-cell__label">This cycle total</span>
          <span className="billing-cycle-cell__value billing-cycle-cell__value--sky">
            ${cycleTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Mobile: field-row style */}
      <div className="billing-cycle-rows">
        {contractsEnabled && (
          <>
            <div className="billing-cycle-row">
              <span className="billing-cycle-row__label">Documents</span>
              <span className="billing-cycle-row__value">{docsUsed}/{docsLimitLabel}</span>
            </div>
            <div className="billing-cycle-row">
              <div className="billing-progress-track" style={{ flex: 1 }}>
                <div className="billing-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </>
        )}
        <div className="billing-cycle-row">
          <span className="billing-cycle-row__label">Renews on</span>
          <span className="billing-cycle-row__value billing-cycle-row__value--sky">{formatDate(cycle.nextBilling)}</span>
        </div>
        {contractsEnabled && (
          <div className="billing-cycle-row">
            <span className="billing-cycle-row__label">Overage rate</span>
            <span className="billing-cycle-row__value billing-cycle-row__value--sky">${currentPlan.overageRate.toFixed(2)}/doc</span>
          </div>
        )}
        <div className="billing-cycle-row billing-cycle-row--total">
          <span className="billing-cycle-row__label">This cycle total</span>
          <span className="billing-cycle-row__value billing-cycle-row__value--sky">${cycleTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── TopCardsSection — 2-column wrapper ─────────────────────────────────────

export function TopCardsSection(props: TopCardsSectionProps) {
  return (
    <div className="billing-top-grid">
      <CurrentPlanCard {...props} />
      <BillingCycleCard
        currentPlan={props.currentPlan}
        cycle={props.cycle}
        usage={props.usage}
        contractsEnabled={props.contractsEnabled}
      />
    </div>
  );
}
