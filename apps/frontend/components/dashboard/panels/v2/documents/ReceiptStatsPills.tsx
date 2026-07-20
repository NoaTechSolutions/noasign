'use client';

import React from 'react';
import type { ReceiptStats } from '../ReceiptMetricCards';
import { statusMeta } from './StatusBadge';

interface ReceiptStatsPillsProps {
  stats: ReceiptStats | null;
  isLoading?: boolean;
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
export function ReceiptStatsPills({ stats, isLoading }: ReceiptStatsPillsProps) {
  const by = stats?.byStatus;
  // Scheduled (deferred drafts) is a subset of the backend `draft` count; split
  // it out so the Draft pill shows only the non-scheduled drafts and the two
  // partition cleanly (Overview keeps using the full `draft` count untouched).
  const scheduled = by?.scheduled ?? 0;
  const draft = Math.max(0, (by?.draft ?? 0) - scheduled);

  // One colour + icon per state, from the shared status system (StatusBadge /
  // --status-* tokens). Row: Sent · Draft · Scheduled · Void.
  const pills = [
    { value: by?.sent ?? 0, hint: 'issued', status: 'SENT' },
    { value: draft, hint: 'editable', status: 'DRAFT' },
    { value: scheduled, hint: 'future-dated', status: 'SCHEDULED' },
    { value: by?.void ?? 0, hint: 'cancelled', status: 'VOID' },
  ];

  return (
    <div className="documents-v2-stats">
      {pills.map((p) => {
        const meta = statusMeta(p.status);
        const Icon = meta.icon;
        return (
          <div
            key={p.status}
            className={`documents-v2-stat-pill documents-v2-stat-pill--${p.status.toLowerCase()}`}
          >
            <div className="documents-v2-stat-pill__head">
              <div className="documents-v2-stat-pill__label">
                <Icon size={13} className="documents-v2-stat-pill__icon" aria-hidden="true" />
                {meta.label}
              </div>
            </div>
            <div className="documents-v2-stat-pill__value">
              <PillValue value={p.value} isLoading={isLoading} />
            </div>
            <div className="documents-v2-stat-pill__hint">{p.hint}</div>
          </div>
        );
      })}
    </div>
  );
}
