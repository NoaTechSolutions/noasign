/**
 * Shared resend cooldown helpers.
 *
 * Originally private to DocumentsService (contracts). Extracted here so the
 * receipt resend flow reuses the EXACT same mechanism instead of reinventing
 * it: a 24h time-based cooldown keyed off `lastManualReminderAt`, bypassed when
 * the recipient email changes (compare against `lastSentRecipientEmail`).
 */

export const MANUAL_REMINDER_COOLDOWN_MS = 1000 * 60 * 60 * 24;

/** The exact moment a resend becomes available again, or null if never sent. */
export function getResendAvailableAt(
  lastManualReminderAt?: Date | string | null,
): Date | null {
  if (!lastManualReminderAt) {
    return null;
  }

  const reminderDate =
    lastManualReminderAt instanceof Date
      ? lastManualReminderAt
      : new Date(lastManualReminderAt);

  if (Number.isNaN(reminderDate.getTime())) {
    return null;
  }

  return new Date(reminderDate.getTime() + MANUAL_REMINDER_COOLDOWN_MS);
}

/** Milliseconds left on the cooldown (0 if expired or never sent). */
export function getResendCooldownRemainingMs(
  lastManualReminderAt?: Date | string | null,
  now: Date = new Date(),
): number {
  const resendAvailableAt = getResendAvailableAt(lastManualReminderAt ?? null);

  if (!resendAvailableAt) {
    return 0;
  }

  return Math.max(0, resendAvailableAt.getTime() - now.getTime());
}

/** Lowercased/trimmed email, or null when empty. */
export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized.length > 0 ? normalized : null;
}

/** Human-readable remaining time, e.g. "2h 15m 30s" / "45m 10s" / "5s". */
export function formatCooldownRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
