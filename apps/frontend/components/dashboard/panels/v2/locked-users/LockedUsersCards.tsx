'use client';

import React from 'react';
import { LockedUserCard } from './LockedUserCard';
import type { LockedUserWithStatus } from './types';

// ---------------------------------------------------------------------------
// Skeleton — 5 placeholder cards mirroring LockedUserCard layout.
// Only visible on mobile (<768px) — same media query as .locked-users-cards.
// ---------------------------------------------------------------------------
const SKELETON_CARDS = 5;

export function LockedUsersCardsSkeleton() {
  return (
    <div className="locked-users-cards" aria-hidden="true">
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <div key={i} className="locked-user-card">
          {/* Header: status dot + email */}
          <div className="locked-user-card__header">
            <span
              className="skeleton-pulse skeleton-circle"
              style={{ display: 'inline-block', width: 8, height: 8, flexShrink: 0 }}
            />
            <span
              className="skeleton-pulse skeleton-line"
              style={{ display: 'inline-block', width: 200, height: 14 }}
            />
          </div>
          {/* Info: "Locked Xm ago · in Ym" */}
          <div className="locked-user-card__info">
            <span
              className="skeleton-pulse skeleton-line"
              style={{ display: 'inline-block', width: 160, height: 12 }}
            />
          </div>
          {/* Footer: attempts badge + unlock button */}
          <div className="locked-user-card__footer">
            <span
              className="skeleton-pulse skeleton-line"
              style={{ display: 'inline-block', width: 90, height: 22, borderRadius: 6 }}
            />
            <span
              className="skeleton-pulse skeleton-line"
              style={{ display: 'inline-block', width: 80, height: 30, borderRadius: 20 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
// ---------------------------------------------------------------------------

interface LockedUsersCardsProps {
  users: LockedUserWithStatus[];
  onUnlock: (userId: string) => void;
}

export function LockedUsersCards({ users, onUnlock }: LockedUsersCardsProps) {
  return (
    <div className="locked-users-cards">
      {users.map((u) => (
        <LockedUserCard key={u.userId} user={u} onUnlock={onUnlock} />
      ))}
    </div>
  );
}
