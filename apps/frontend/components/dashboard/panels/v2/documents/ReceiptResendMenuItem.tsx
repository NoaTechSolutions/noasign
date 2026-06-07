'use client';

import { useEffect, useState } from 'react';
import type { V2DocumentAction, V2DocumentItem } from './types';
import { getActionLabel } from './types';

/**
 * Kebab item for a receipt's Resend/Retry. Reflects the resend policy v2:
 *   - hard cap → disabled, "… · Limit reached" (no countdown, never unblocks)
 *   - window cooldown → disabled + a live MM:SS countdown (from the backend's
 *     retryAfterSeconds); enables itself when it hits 00:00
 *   - ready → normal action
 */
export function ReceiptResendMenuItem({
  doc,
  action,
  itemClass,
  onAction,
}: {
  doc: V2DocumentItem;
  action: V2DocumentAction; // 'resend' | 'retry'
  itemClass: string;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
}) {
  const rr = doc.receiptResend;
  const label = getActionLabel(action);
  const cooldownSeconds =
    rr && !rr.canResend && !rr.limitReached ? rr.retryAfterSeconds : 0;

  const [remaining, setRemaining] = useState(cooldownSeconds);
  // Reset the countdown when a fresh policy value arrives (adjust-during-render,
  // not an effect → no cascading-render lint error).
  const [seenCooldown, setSeenCooldown] = useState(cooldownSeconds);
  if (cooldownSeconds !== seenCooldown) {
    setSeenCooldown(cooldownSeconds);
    setRemaining(cooldownSeconds);
  }
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Hard cap — permanent block, no countdown.
  if (rr?.limitReached) {
    return (
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        disabled
        aria-disabled="true"
      >
        {label} · Limit reached
      </button>
    );
  }

  // Sliding-window cooldown — disabled with a live MM:SS countdown.
  if (remaining > 0) {
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    return (
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        disabled
        aria-disabled="true"
      >
        {label} {`${mm}:${ss}`}
      </button>
    );
  }

  // Ready.
  return (
    <button
      type="button"
      role="menuitem"
      className={itemClass}
      onClick={() => void onAction(action, doc.id)}
    >
      {label}
    </button>
  );
}
