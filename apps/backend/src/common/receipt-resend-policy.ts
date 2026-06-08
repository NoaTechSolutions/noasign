import { formatCooldownRemaining, normalizeEmail } from './resend-cooldown';

/**
 * Receipt resend policy v2 — a per-(receipt, recipient email) sliding window
 * with a hard cap. RECEIPTS ONLY; contracts keep the 24h cooldown in
 * resend-cooldown.ts.
 *
 *   - Initial send + 2 fast resends → 3-email BURST, no throttle.
 *   - After the burst → 1 email per 10-minute WINDOW.
 *   - HARD CAP of 10 total attempts to the pair → permanent block.
 *   - Changing the recipient email → fresh pair, counter resets to 0.
 *
 * The counter (sendCount) and lastAttemptAt count EVERY attempt — SENT and
 * SEND_FAILED alike — which is why the window is measured off lastAttemptAt
 * (updated on every attempt) rather than sentAt (success only).
 */
export const RECEIPT_SEND_BURST = 3;
export const RECEIPT_SEND_WINDOW_MS = 10 * 60 * 1000;
export const RECEIPT_SEND_HARD_CAP = 10;

export type ReceiptResendDecision =
  | { allowed: true; resetCounter: boolean }
  | { allowed: false; reason: 'hard-cap' }
  | { allowed: false; reason: 'cooldown'; retryAfterMs: number };

export function evaluateReceiptResend(input: {
  sendCount: number;
  lastAttemptAt?: Date | string | null;
  lastEmail?: string | null;
  currentEmail: string;
  now?: Date;
}): ReceiptResendDecision {
  const now = input.now ?? new Date();
  const emailChanged =
    normalizeEmail(input.currentEmail) !==
    normalizeEmail(input.lastEmail ?? null);
  // Email change → fresh pair: counter resets, full burst available again.
  const count = emailChanged ? 0 : input.sendCount;

  if (count >= RECEIPT_SEND_HARD_CAP) {
    return { allowed: false, reason: 'hard-cap' };
  }
  if (count >= RECEIPT_SEND_BURST) {
    const last = toDate(input.lastAttemptAt);
    const elapsed = last
      ? now.getTime() - last.getTime()
      : RECEIPT_SEND_WINDOW_MS;
    if (elapsed < RECEIPT_SEND_WINDOW_MS) {
      return {
        allowed: false,
        reason: 'cooldown',
        retryAfterMs: RECEIPT_SEND_WINDOW_MS - elapsed,
      };
    }
  }
  return { allowed: true, resetCounter: emailChanged };
}

/** Human-readable block message (English). */
export function receiptResendBlockMessage(
  decision: Extract<ReceiptResendDecision, { allowed: false }>,
  email: string,
): string {
  if (decision.reason === 'hard-cap') {
    return `This receipt has reached the limit of ${RECEIPT_SEND_HARD_CAP} emails to ${email}. Change the recipient to send again.`;
  }
  return `This receipt was sent recently. You can send again in ${formatCooldownRemaining(
    decision.retryAfterMs,
  )}.`;
}

/** Next sendCount after a successful-or-failed attempt. */
export function nextSendCount(
  decision: Extract<ReceiptResendDecision, { allowed: true }>,
  currentSendCount: number,
): number {
  return (decision.resetCounter ? 0 : currentSendCount) + 1;
}

function toDate(v?: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
