'use client';

import React from 'react';
import type { LockedUserWithStatus } from './types';
import { formatTimeAgo, formatCountdown } from './types';

interface LockedUserTableRowProps {
  user: LockedUserWithStatus;
  onUnlock: (userId: string) => void;
}

export function LockedUserTableRow({ user, onUnlock }: LockedUserTableRowProps) {
  return (
    <tr className="locked-user-row">
      <td>
        <span className={`status-dot status-dot--${user.status.toLowerCase()}`} />
      </td>
      <td>{user.email}</td>
      <td className="text-muted">{formatTimeAgo(user.lockedAt)}</td>
      <td className={user.isLocked && user.minutesUntilUnlock < 5 ? 'countdown-urgent' : ''}>
        {formatCountdown(user.minutesUntilUnlock)}
      </td>
      <td>
        <span className="attempts-badge">{user.failedAttempts}/5</span>
      </td>
      <td>
        {user.isLocked ? (
          <button
            type="button"
            className="unlock-btn"
            onClick={() => onUnlock(user.userId)}
            title="Unlock immediately"
          >
            ⚡
          </button>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
    </tr>
  );
}
