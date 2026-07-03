'use client';

import { Check, Loader2, X } from 'lucide-react';

export type SendToastState = 'loading' | 'success' | 'error';

// Custom react-hot-toast content with an animated progress bar, shared by the
// receipt and contract send/resend flows. The bar is purely visual (no real
// progress): it eases to ~90% while we wait, then the success/error update
// fills it to 100% in its colour.
export function SendToast({
  state,
  message,
  onDismiss,
}: {
  state: SendToastState;
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`receipt-toast receipt-toast--${state}`}
      role="status"
      aria-live="polite"
    >
      <div className="receipt-toast__head">
        <span className="receipt-toast__icon">
          {state === 'loading' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : state === 'success' ? (
            <Check size={16} />
          ) : (
            <X size={16} />
          )}
        </span>
        <span className="receipt-toast__msg">{message}</span>
        {onDismiss && state !== 'loading' ? (
          <button
            type="button"
            className="receipt-toast__close"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <div className="receipt-toast__track">
        <div className={`receipt-toast__fill receipt-toast__fill--${state}`} />
      </div>
    </div>
  );
}
