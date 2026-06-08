'use client';

import React from 'react';
import type { LockedUserWithStatus } from './types';
import { formatTimeAgo, formatCountdown } from './types';

interface LockedUserCardProps {
  user: LockedUserWithStatus;
  onUnlock: (userId: string) => void;
}

export function LockedUserCard({ user, onUnlock }: LockedUserCardProps) {
  return (
    <div className="locked-user-card">
      <div className="locked-user-card__header">
        <span className={`status-dot status-dot--${user.status.toLowerCase()}`} />
        <span className="locked-user-card__email">{user.email}</span>
      </div>
      <div className="locked-user-card__info">
        Locked {formatTimeAgo(user.lockedAt)} · {formatCountdown(user.minutesUntilUnlock)}
      </div>
      <div className="locked-user-card__footer">
        <span className="attempts-badge">{user.failedAttempts} failed attempts</span>
        {user.isLocked && (
          <button
            type="button"
            className="unlock-btn"
            onClick={() => onUnlock(user.userId)}
          >
            ⚡ Unlock
          </button>
        )}
      </div>
    </div>
  );
}
