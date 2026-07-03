import React from 'react';
import { PiggyBank, TrendingUp, DollarSign } from 'lucide-react';

interface HighlightCardProps {
  variant: 'savings' | 'amount';
  // savings (documents): pay-per-doc cost vs the plan's monthly price.
  docsThisMonth?: number;
  ppcCost?: number; // docsThisMonth × $12 pay-per-doc
  planCost?: number; // plan monthly price
  // amount (receipts): $ receipted this month.
  amount?: number;
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
 * Row-2 right card — the green "highlight" (value) card. For receipts it shows the
 * $ amount receipted this month. For documents it shows the savings vs pay-per-doc;
 * when usage is too low for a positive number, it falls back to the value generated
 * (sober, positive framing) instead of a negative "saved".
 */
export function HighlightCard({
  variant,
  docsThisMonth = 0,
  ppcCost = 0,
  planCost = 0,
  amount = 0,
  isLoading,
}: HighlightCardProps) {
  const docLabel = (n: number) => `${n} document${n === 1 ? '' : 's'}`;

  // Receipts — $ receipted this month.
  if (variant === 'amount') {
    return (
      <div className="ov-card ov-highlight">
        <span className="ov-card__label"><DollarSign size={15} /> Amount this month</span>
        <span className="ov-card__value">{isLoading ? '—' : usd(amount)}</span>
        <span className="ov-card__foot">Total receipted this month</span>
      </div>
    );
  }

  // No usage yet this month — a "$0" saved/value is a meaningless number, so show
  // a sober prompt instead (the "value generated" fallback would also be $0 here).
  if (docsThisMonth === 0) {
    return (
      <div className="ov-card ov-highlight">
        <span className="ov-card__label"><PiggyBank size={15} /> Savings this month</span>
        <span className="ov-card__value ov-card__value--prompt">Start creating</span>
        <span className="ov-card__foot">
          Each document you generate saves vs $12/doc pay-per-doc
        </span>
        <span className="ov-card__foot-compact">vs pay-per-doc</span>
      </div>
    );
  }

  // Documents — savings vs pay-per-doc ($12/doc) minus the plan's monthly price.
  const savings = ppcCost - planCost;

  if (savings > 0) {
    return (
      <div className="ov-card ov-highlight">
        <span className="ov-card__label"><PiggyBank size={15} /> You saved this month</span>
        <span className="ov-card__value">{isLoading ? '—' : usd(savings)}</span>
        <span className="ov-card__foot">
          {docLabel(docsThisMonth)} · pay-per-doc{' '}
          <span className="ov-card__value-strike">{usd(ppcCost)}</span> · your plan {usd(planCost)}/mo
        </span>
        <span className="ov-card__foot-compact">vs pay-per-doc</span>
      </div>
    );
  }

  // Low-usage edge: savings would be ≤ 0. Show the value generated instead of a
  // negative "saved" number.
  return (
    <div className="ov-card ov-highlight">
      <span className="ov-card__label"><TrendingUp size={15} /> Value this month</span>
      <span className="ov-card__value">{isLoading ? '—' : usd(ppcCost)}</span>
      <span className="ov-card__foot">
        {docLabel(docsThisMonth)} · worth {usd(ppcCost)} at $12/doc pay-per-doc
      </span>
      <span className="ov-card__foot-compact">vs pay-per-doc</span>
    </div>
  );
}
