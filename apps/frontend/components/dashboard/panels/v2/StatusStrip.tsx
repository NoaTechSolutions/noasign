import React from 'react';
import { Skeleton } from '@/components/dashboard/shared/ui';

export interface StatusStripItem {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  // Colour tone: green | green-soft | navy | sky | amber | red.
  tone: string;
}

interface StatusStripProps {
  title: string;
  // Optional caption under the title (e.g. "July 2026 · current month"). Small,
  // text-secondary. When present, the counts below are scoped to that period.
  subtitle?: string;
  items: StatusStripItem[];
  isLoading: boolean;
  // Drives the grid density: documents = 6 mini-cards, receipts = 4.
  variant?: 'documents' | 'receipts';
  // Optional bottom-right link (thin separator above), e.g. "View history →".
  footerLink?: { label: string; onClick: () => void };
}

/**
 * Compact status row — one line of mini-cards (icon + big number + small label).
 * Replaces the old per-status breakdown with bars: statuses have no quota, so a
 * count is all that's needed. Shared by the document and receipt overviews.
 */
export function StatusStrip({ title, subtitle, items, isLoading, variant = 'documents', footerLink }: StatusStripProps) {
  return (
    <div className="status-strip">
      <div className="status-strip__header">
        <h2 className="status-strip__title">{title}</h2>
        {subtitle ? <p className="status-strip__subtitle">{subtitle}</p> : null}
      </div>
      <div className={`status-strip__grid status-strip__grid--${variant}`}>
        {items.map((it) => (
          <div key={it.key} className={`status-mini status-mini--${it.tone}`}>
            <span className="status-mini__icon" aria-hidden="true">{it.icon}</span>
            <span className="status-mini__count">
              {isLoading ? <Skeleton width={24} height={22} /> : it.count}
            </span>
            <span className="status-mini__label">{it.label}</span>
          </div>
        ))}
      </div>
      {footerLink ? (
        <div className="status-strip__footer">
          <button type="button" className="status-strip__link" onClick={footerLink.onClick}>
            {footerLink.label} <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
