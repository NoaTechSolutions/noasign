'use client';

import React from 'react';
import type { ReceiptStats } from '../ReceiptMetricCards';

interface ReceiptStatsPillsProps {
  stats: ReceiptStats | null;
  isLoading?: boolean;
  // When set, the "Total" pill shows a "Detail →" link opening the by-type popup.
  onTotalDetail?: () => void;
}

function PillValue({ value, isLoading }: { value: number; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <span
        className="skeleton-pulse skeleton-line"
        style={{ display: 'inline-block', width: '34px', height: '22px' }}
        aria-hidden="true"
      />
    );
  }
  return <>{value}</>;
}

/**
 * Receipt counters for the receipts-only Documents module — replaces the
 * contract-oriented DocumentsStats. Reuses the .documents-v2-stat-pill styles.
 */
export function ReceiptStatsPills({
  stats,
  isLoading,
  onTotalDetail,
}: ReceiptStatsPillsProps) {
  const by = stats?.byStatus;
  const total =
    (by?.draft ?? 0) +
    (by?.sent ?? 0) +
    (by?.sendFailed ?? 0) +
    (by?.cancelled ?? 0) +
    (by?.void ?? 0);

  const pills = [
    { label: 'Total', value: total, hint: 'receipts', tone: 'blue' },
    { label: 'Sent', value: by?.sent ?? 0, hint: 'issued', tone: 'green' },
    { label: 'Draft', value: by?.draft ?? 0, hint: 'editable', tone: 'slate' },
    { label: 'Void', value: by?.void ?? 0, hint: 'cancelled', tone: 'amber' },
  ];

  return (
    <div className="documents-v2-stats">
      {pills.map((p) => (
        <div
          key={p.label}
          className={`documents-v2-stat-pill documents-v2-stat-pill--${p.tone}`}
        >
          <div className="documents-v2-stat-pill__head">
            <div className="documents-v2-stat-pill__label">{p.label}</div>
            {p.label === 'Total' && onTotalDetail ? (
              <button
                type="button"
                className="documents-v2-stat-pill__detail"
                onClick={onTotalDetail}
              >
                Detail →
              </button>
            ) : null}
          </div>
          <div className="documents-v2-stat-pill__value">
            <PillValue value={p.value} isLoading={isLoading} />
          </div>
          <div className="documents-v2-stat-pill__hint">{p.hint}</div>
        </div>
      ))}
    </div>
  );
}
