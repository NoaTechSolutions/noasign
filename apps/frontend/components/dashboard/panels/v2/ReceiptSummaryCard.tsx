import React from 'react';
import { Receipt, DollarSign } from 'lucide-react';

interface ReceiptSummaryCardProps {
  receiptsThisMonth: number;
  amountThisMonth: number;
  isLoading: boolean;
}

function usd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Row-2 left card for receipts — combines two figures in one card: the volume this
 * month (top) and the $ amount receipted this month (bottom, green), split by a
 * thin divider.
 */
export function ReceiptSummaryCard({
  receiptsThisMonth,
  amountThisMonth,
  isLoading,
}: ReceiptSummaryCardProps) {
  return (
    <div className="ov-card ov-receipt-summary">
      <div className="ov-summary-block">
        <span className="ov-card__label"><Receipt size={15} /> Receipts this month</span>
        <span className="ov-card__value">{isLoading ? '—' : receiptsThisMonth}</span>
      </div>
      <div className="ov-summary-divider" />
      <div className="ov-summary-block">
        <span className="ov-card__label ov-summary-amount">
          <DollarSign size={15} /> Amount this month
        </span>
        <span className="ov-card__value ov-summary-amount">
          {isLoading ? '—' : usd(amountThisMonth)}
        </span>
      </div>
    </div>
  );
}
