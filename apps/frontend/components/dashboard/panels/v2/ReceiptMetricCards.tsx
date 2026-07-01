import React from 'react';
import { Receipt, DollarSign } from 'lucide-react';

// Shape returned by GET /documents/receipt/stats.
export interface ReceiptStats {
  billingPeriod: string;
  receiptsThisMonth: number;
  totalIssued: number;
  amountThisMonth: number;
  byStatus: {
    draft: number;
    sent: number;
    sendFailed: number;
    cancelled: number;
    void: number;
  };
}

interface ReceiptMetricCardsProps {
  stats: ReceiptStats | null;
  isLoading: boolean;
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Receipts-focused metric row for the RECEIPTS_ONLY overview. Two prominent
 * cards only — the volume this month and the $ this month. "Total issued" and
 * "Drafts" were dropped because they duplicated the Receipt status card (Sent /
 * Draft pills). Uses the shared .metric-cards grid (now 2-up).
 */
export function ReceiptMetricCards({ stats, isLoading }: ReceiptMetricCardsProps) {
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

  const thisMonth = stats?.receiptsThisMonth ?? 0;
  const amount = stats?.amountThisMonth ?? 0;

  return (
    <div className="metric-cards metric-cards--duo">
      {/* Receipts this month */}
      <div className="metric-card metric-card--sky">
        <div className="metric-card__header">
          <span className="metric-card__icon"><Receipt size={16} /></span>
          <span className="metric-card__label">This month</span>
        </div>
        <div className="metric-card__value">{thisMonth}</div>
        <div className="metric-card__foot">receipts issued</div>
      </div>

      {/* Amount this month */}
      <div className="metric-card metric-card--green">
        <div className="metric-card__header">
          <span className="metric-card__icon"><DollarSign size={16} /></span>
          <span className="metric-card__label">Amount this month</span>
        </div>
        <div className="metric-card__value">{formatMoney(amount)}</div>
        <div className="metric-card__foot">total receipted</div>
      </div>
    </div>
  );
}
