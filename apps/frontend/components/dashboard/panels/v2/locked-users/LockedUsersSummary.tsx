'use client';

import React from 'react';
import type { LockedUserWithStatus } from './types';

// ---------------------------------------------------------------------------
// Skeleton — rendered during initial load (before first fetch resolves)
// ---------------------------------------------------------------------------
export function LockedUsersSummarySkeleton() {
  return (
    <div className="lockout-summary" aria-hidden="true">
      <div className="lockout-summary__icon">
        <span
          className="skeleton-pulse skeleton-circle"
          style={{ width: 28, height: 28 }}
        />
      </div>
      <div className="lockout-summary__content">
        {/* Label row */}
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'block', width: 100, height: 12, marginBottom: 8 }}
        />
        {/* Value (large number) */}
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'block', width: 40, height: 28, marginBottom: 8 }}
        />
        {/* Hint row */}
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'block', width: 160, height: 12 }}
        />
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------

interface LockedUsersSummaryProps {
  activeLockouts: number;
  users: LockedUserWithStatus[];
}

export function LockedUsersSummary({ activeLockouts, users }: LockedUsersSummaryProps) {
  const lockedUsers = users.filter((u) => u.isLocked);
  // Guard: if there are no locked users, Math.min(...[]) returns Infinity.
  const minUnlock = lockedUsers.length
    ? Math.min(...lockedUsers.map((u) => u.minutesUntilUnlock))
    : 0;
  const maxUnlock = lockedUsers.length
    ? Math.max(...lockedUsers.map((u) => u.minutesUntilUnlock))
    : 0;

  const hintText =
    minUnlock === maxUnlock
      ? `Auto-unlock in ${minUnlock} min`
      : `Auto-unlock in ${minUnlock}-${maxUnlock} min`;

  return (
    <div className="lockout-summary">
      <div className="lockout-summary__icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8v1H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1z"/>
        </svg>
      </div>
      <div className="lockout-summary__content">
        <div className="lockout-summary__label">Active Lockouts</div>
        <div className="lockout-summary__value">{activeLockouts}</div>
        <div className="lockout-summary__hint">{hintText}</div>
      </div>
    </div>
  );
}
