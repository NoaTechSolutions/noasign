import React from 'react';

export interface StatusStripItem {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
}

interface StatusStripProps {
  title: string;
  items: StatusStripItem[];
  isLoading: boolean;
  // Drives the grid density: documents = 6 mini-cards, receipts = 4.
  variant?: 'documents' | 'receipts';
}

/**
 * Compact status row — one line of mini-cards (icon + big number + small label).
 * Replaces the old per-status breakdown with bars: statuses have no quota, so a
 * count is all that's needed. Shared by the document and receipt overviews.
 */
export function StatusStrip({ title, items, isLoading, variant = 'documents' }: StatusStripProps) {
  return (
    <div className="status-strip">
      <h2 className="status-strip__title">{title}</h2>
      <div className={`status-strip__grid status-strip__grid--${variant}`}>
        {items.map((it) => (
          <div key={it.key} className="status-mini">
            <span className="status-mini__icon" aria-hidden="true">{it.icon}</span>
            <span className="status-mini__count">{isLoading ? '—' : it.count}</span>
            <span className="status-mini__label">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
