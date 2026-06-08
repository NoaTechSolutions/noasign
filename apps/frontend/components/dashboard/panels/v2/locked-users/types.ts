// Panel-internal LockedUser shape. page.tsx adapter maps backend
// LockedUserDto (id, lockedUntil, failedLoginAttempts, role) → this shape.
export interface LockedUser {
  userId: string;
  email: string;
  lockedAt: string;       // ISO datetime — derived from lockedUntil - duration
  unlockAt: string;       // ISO datetime — mapped from backend lockedUntil
  failedAttempts: number; // mapped from failedLoginAttempts
  lockLevel: number;      // 1=1min, 2=5min, 3=permanent
  lastAttemptAt: string;  // ISO datetime — backend doesn't track this; adapter uses lockedUntil as approx
}

// Extended with computed fields (status, countdown)
export interface LockedUserWithStatus extends LockedUser {
  isLocked: boolean;
  minutesUntilUnlock: number;
  status: 'LOCKED' | 'UNLOCKED';
}

// Compute status based on unlockAt
export function computeStatus(user: LockedUser): LockedUserWithStatus {
  const now = new Date();
  const unlockDate = new Date(user.unlockAt);
  const isPermanent = user.lockLevel >= 3;
  const isLocked = isPermanent || unlockDate > now;
  const minutesUntilUnlock = isPermanent
    ? Infinity
    : isLocked
      ? Math.max(0, Math.floor((unlockDate.getTime() - now.getTime()) / 60000))
      : 0;

  return {
    ...user,
    isLocked,
    minutesUntilUnlock,
    status: isLocked ? 'LOCKED' : 'UNLOCKED',
  };
}

// Format time ago (e.g., "2m ago", "1h ago", "2d ago")
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Format countdown (e.g., "in 28m", "in 1h 15m", "unlocked")
export function formatCountdown(minutes: number): string {
  if (!isFinite(minutes)) return 'permanent';
  if (minutes <= 0) return 'unlocked';
  if (minutes < 60) return `in ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
}
