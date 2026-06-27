import React from 'react';
import { FileText, Clock, CircleCheck, CreditCard } from 'lucide-react';
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

interface OverviewDocument {
  status: string;
  completedAt?: string | null;
}

interface MetricCardsProps {
  usage: CurrentUsage | null;
  monthlySummary: MonthlySummary | null;
  documents: OverviewDocument[] | null;
  isLoading: boolean;
}

function isThisMonth(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function MetricCards({ usage, monthlySummary, documents, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="metric-cards">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="metric-card metric-card--loading">
            <div className="metric-skeleton metric-skeleton--label" />
            <div className="metric-skeleton metric-skeleton--value" />
          </div>
        ))}
      </div>
    );
  }

  const docs = documents ?? [];
  const used = usage?.documentsUsed ?? 0;
  const limit = usage?.documentsLimit ?? 0;
  const isUnlimited = usage?.documentsLimit === null;
  const pct = !isUnlimited && limit > 0 ? Math.round((used / limit) * 100) : 0;
  const pctClass = pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'success';

  const pending = docs.filter((d) => d.status === 'SENT' || d.status === 'VIEWED').length;
  const completedThisMonth = docs.filter(
    (d) => d.status === 'COMPLETED' && isThisMonth(d.completedAt),
  ).length;

  const billing = monthlySummary?.billingAmount ?? 0;
  const overage = monthlySummary?.overage ?? 0;

  return (
    <div className="metric-cards">
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

      {/* Pending */}
      <div className="metric-card metric-card--amber">
        <div className="metric-card__header">
          <span className="metric-card__icon"><Clock size={16} /></span>
          <span className="metric-card__label">Pending</span>
        </div>
        <div className="metric-card__value">{pending}</div>
        <div className="metric-card__foot">awaiting signature</div>
      </div>

      {/* Completed */}
      <div className="metric-card metric-card--green">
        <div className="metric-card__header">
          <span className="metric-card__icon"><CircleCheck size={16} /></span>
          <span className="metric-card__label">Completed</span>
        </div>
        <div className="metric-card__value">{completedThisMonth}</div>
        <div className="metric-card__foot">this month</div>
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
