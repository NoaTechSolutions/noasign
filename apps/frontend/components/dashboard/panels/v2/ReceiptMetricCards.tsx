import React from 'react';
import { Receipt, FileText, DollarSign, Pencil } from 'lucide-react';

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
 * Receipts-focused metric row for the RECEIPTS_ONLY overview. Repurposes the
 * shared .metric-cards grid (same look as the contracts metrics) but with
 * receipt data: this month, total issued, $ this month, drafts pending.
 */
export function ReceiptMetricCards({ stats, isLoading }: ReceiptMetricCardsProps) {
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

  const thisMonth = stats?.receiptsThisMonth ?? 0;
  const totalIssued = stats?.totalIssued ?? 0;
  const amount = stats?.amountThisMonth ?? 0;
  const drafts = stats?.byStatus.draft ?? 0;

  return (
    <div className="metric-cards">
      {/* Receipts this month */}
      <div className="metric-card metric-card--sky">
        <div className="metric-card__header">
          <span className="metric-card__icon"><Receipt size={16} /></span>
          <span className="metric-card__label">This month</span>
        </div>
        <div className="metric-card__value">{thisMonth}</div>
        <div className="metric-card__foot">receipts issued</div>
      </div>

      {/* Total issued */}
      <div className="metric-card metric-card--neutral">
        <div className="metric-card__header">
          <span className="metric-card__icon"><FileText size={16} /></span>
          <span className="metric-card__label">Total issued</span>
        </div>
        <div className="metric-card__value">{totalIssued}</div>
        <div className="metric-card__foot">all time</div>
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

      {/* Drafts pending */}
      <div className="metric-card metric-card--amber">
        <div className="metric-card__header">
          <span className="metric-card__icon"><Pencil size={16} /></span>
          <span className="metric-card__label">Drafts</span>
        </div>
        <div className="metric-card__value">{drafts}</div>
        <div className="metric-card__foot">pending to send</div>
      </div>
    </div>
  );
}
