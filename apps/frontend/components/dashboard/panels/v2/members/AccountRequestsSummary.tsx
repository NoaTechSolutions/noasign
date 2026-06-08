'use client';

import React from 'react';

interface AccountRequestsSummaryProps {
  pendingCount: number;
  loading?: boolean;
}

export function AccountRequestsSummary({ pendingCount, loading = false }: AccountRequestsSummaryProps) {
  if (loading) {
    return (
      <div className="summary-card summary-card--slate">
        <span className="skeleton-pulse skeleton-circle" style={{ width: 48, height: 48, display: 'inline-block', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <span className="skeleton-pulse skeleton-line" style={{ width: 120, height: 13, display: 'block' }} />
          <span className="skeleton-pulse skeleton-line" style={{ width: 40, height: 28, display: 'block' }} />
          <span className="skeleton-pulse skeleton-line" style={{ width: 140, height: 13, display: 'block' }} />
        </div>
      </div>
    );
  }

  if (pendingCount === 0) return null;

  let toneClass = 'summary-card--slate';
  if (pendingCount >= 10) {
    toneClass = 'summary-card--rose';
  } else if (pendingCount >= 5) {
    toneClass = 'summary-card--amber';
  }

  return (
    <div className={`summary-card ${toneClass}`}>
      <div className="summary-card__icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
      </div>
      <div className="summary-card__content">
        <div className="summary-card__label">Pending Requests</div>
        <div className="summary-card__value">{pendingCount}</div>
        <div className="summary-card__hint">
          {pendingCount === 1 ? 'request' : 'requests'} awaiting review
        </div>
      </div>
    </div>
  );
}
