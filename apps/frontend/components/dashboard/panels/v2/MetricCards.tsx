import React from 'react';
import { FileText, CreditCard } from 'lucide-react';
import { formatUsage } from '@/lib/plan-catalog';

interface CurrentUsage {
  documentsUsed: number;
  documentsLimit: number | null; // null = unlimited
  overageCount?: number;
}

interface MonthlySummary {
  billingAmount: number;
  overage: number;
}

interface MetricCardsProps {
  usage: CurrentUsage | null;
  monthlySummary: MonthlySummary | null;
  isLoading: boolean;
}

/**
 * Contract-document metric row. Two prominent cards only: plan usage this month
 * (with the quota progress bar) and the billing amount. "Pending" and "Completed"
 * were dropped because they duplicated the Document status card (Sent/Viewed/
 * Completed pills). Uses the shared .metric-cards grid (now 2-up).
 */
export function MetricCards({ usage, monthlySummary, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="metric-cards metric-cards--duo">
        {[0, 1].map((i) => (
          <div key={i} className="metric-card metric-card--loading">
            <div className="metric-skeleton metric-skeleton--label" />
            <div className="metric-skeleton metric-skeleton--value" />
          </div>
        ))}
      </div>
    );
  }

  const used = usage?.documentsUsed ?? 0;
  const limit = usage?.documentsLimit ?? 0;
  const isUnlimited = usage?.documentsLimit === null;
  const pct = !isUnlimited && limit > 0 ? Math.round((used / limit) * 100) : 0;
  const pctClass = pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'success';

  const billing = monthlySummary?.billingAmount ?? 0;
  const overage = monthlySummary?.overage ?? 0;

  return (
    <div className="metric-cards metric-cards--duo">
      {/* This month — usage + progress */}
      <div className="metric-card metric-card--sky">
        <div className="metric-card__header">
          <span className="metric-card__icon"><FileText size={16} /></span>
          <span className="metric-card__label">This month</span>
        </div>
        <div className="metric-card__value">
          {isUnlimited ? (
            formatUsage(used, null)
          ) : (
            <>
              {used} <span className="metric-card__value-sub">/ {limit}</span>
            </>
          )}
        </div>
        {!isUnlimited && (
          <div className={`metric-progress metric-progress--${pctClass}`}>
            <div className="metric-progress__fill" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
        <div className="metric-card__foot">
          {isUnlimited ? 'Unlimited on your plan' : `${pct}% of plan limit`}
        </div>
      </div>

      {/* Billing */}
      <div className="metric-card metric-card--neutral">
        <div className="metric-card__header">
          <span className="metric-card__icon"><CreditCard size={16} /></span>
          <span className="metric-card__label">Billing</span>
        </div>
        <div className="metric-card__value">${billing}</div>
        <div className="metric-card__foot">
          {overage > 0 ? `+ $${overage} overage` : 'no overage'}
        </div>
      </div>
    </div>
  );
}
