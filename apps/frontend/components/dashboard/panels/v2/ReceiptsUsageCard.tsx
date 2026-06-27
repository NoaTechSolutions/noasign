'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import './receipts-usage-card.css';

export interface ReceiptsUsageCardProps {
  /** Receipts emitted this billing cycle. */
  used: number;
  /** Monthly receipt allowance (ignored when `unlimited`). */
  limit: number;
  /** True for plans with no receipt cap (PRO/SCALE/RECEIPTS_ONLY, legacy). */
  unlimited: boolean;
  /** Price per receipt over the monthly limit (e.g. 0.25). */
  overagePrice: number;
  /** Optional month label rendered as a badge (e.g. "Jan 2025"). */
  cycleMonth?: string;
  isLoading?: boolean;
}

/**
 * Receipts usage card — the receipt-billing twin of the contracts "Monthly
 * usage" card. Receipts are a per-tenant dimension (Model C) separate from
 * contracts, so they get their own card. Self-contained styles (no dependency
 * on billing-panel.css) so it can render in Overview, Documents and Billing.
 */
export function ReceiptsUsageCard({
  used,
  limit,
  unlimited,
  overagePrice,
  cycleMonth,
  isLoading = false,
}: ReceiptsUsageCardProps) {
  const pct =
    !unlimited && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : 0;
  const remaining = unlimited ? null : Math.max(0, limit - used);

  if (isLoading) {
    return (
      <div className="receipts-usage-card" aria-busy="true">
        <div className="receipts-usage-card__head">
          <span className="receipts-usage-card__head-left">
            <span className="receipts-usage-card__icon">
              <Receipt size={16} />
            </span>
            <h2 className="receipts-usage-card__title">Receipts</h2>
          </span>
        </div>
        <div className="receipts-usage-card__body">
          <div className="receipts-usage-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="receipts-usage-card">
      <div className="receipts-usage-card__head">
        <span className="receipts-usage-card__head-left">
          <span className="receipts-usage-card__icon">
            <Receipt size={16} />
          </span>
          <h2 className="receipts-usage-card__title">Receipts</h2>
        </span>
        {cycleMonth ? (
          <span className="receipts-usage-card__month-badge">{cycleMonth}</span>
        ) : null}
      </div>

      <div className="receipts-usage-card__body">
        <div className="receipts-usage-item">
          <div className="receipts-usage-item__top">
            <span className="receipts-usage-item__label">This month</span>
          </div>

          {unlimited ? (
            <div className="receipts-usage-item__mid">
              <span className="receipts-usage-item__value">{used}</span>
              <span className="receipts-usage-item__limit">/ Unlimited</span>
            </div>
          ) : (
            <>
              <div className="receipts-usage-item__mid">
                <span className="receipts-usage-item__value">{used}</span>
                <span className="receipts-usage-item__limit">
                  / {limit} included
                </span>
                <span className="receipts-usage-item__badge">{pct}%</span>
              </div>
              <div className="receipts-usage-item__bar">
                <div
                  className="receipts-usage-item__fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}

          <p className="receipts-usage-item__hint">
            {unlimited
              ? 'Unlimited receipts on your plan.'
              : `${remaining} remaining · then $${overagePrice.toFixed(2)} each`}
          </p>
        </div>
      </div>
    </div>
  );
}
