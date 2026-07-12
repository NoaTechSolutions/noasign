'use client';

import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import './issue-date-disclaimer-modal.css';

interface IssueDateDisclaimerModalProps {
  onCancel: () => void;
  // `notify` = whether the user opted into the "ready to finalize" email (only
  // offered for a future issue date; always false otherwise).
  onConfirm: (notify: boolean) => void;
  // Show the notify opt-in — true only when the issue date is in the future.
  showNotifyOptIn?: boolean;
}

/**
 * Shown before creating a receipt or invoice whose issue date is NOT today. The
 * user must tick the acknowledgement before continuing. Copy is the owner's draft
 * (pending legal review before production). Reuses the shared overlay backdrop.
 * Mount it conditionally (parents render it only while a create is pending) so it
 * starts fresh — the checkbox always begins unchecked.
 */
export function IssueDateDisclaimerModal({
  onCancel,
  onConfirm,
  showNotifyOptIn = false,
}: IssueDateDisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="coming-soon-overlay" onClick={onCancel}>
      <div
        className="issue-disclaimer-modal"
        role="alertdialog"
        aria-labelledby="issue-disclaimer-title"
        aria-describedby="issue-disclaimer-body"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="issue-disclaimer-modal__head">
          <span className="issue-disclaimer-modal__icon" aria-hidden="true">
            <CalendarClock size={22} strokeWidth={1.75} />
          </span>
          <h3 id="issue-disclaimer-title" className="issue-disclaimer-modal__title">
            About the issue date
          </h3>
        </div>

        <div id="issue-disclaimer-body" className="issue-disclaimer-modal__body">
          <p>
            The issue date should reflect the actual date on which the goods or
            services were provided, or on which the transaction took place. Entering
            a date that does not reflect the real transaction date — for example, to
            move income into a different tax period, delay or accelerate obligations,
            or misrepresent when a transaction occurred — may violate tax laws and
            accounting rules and could constitute fraud.
          </p>
          <p>By continuing, you acknowledge and agree that:</p>
          <ul>
            <li>
              the date you entered is accurate and reflects the real date of the
              transaction or service;
            </li>
            <li>
              you are solely responsible for the content and accuracy of this
              document and for complying with all applicable tax, accounting, and
              legal requirements in your jurisdiction;
            </li>
            <li>
              NTSsign and NoaTech Solutions provide this tool &ldquo;as is&rdquo; and
              are not responsible or liable for the dates or other information you
              enter, or for how you use the documents you create.
            </li>
          </ul>
          <p>
            NTSsign keeps an internal record of the actual date and time each
            document was created, independently of the issue date you choose.
          </p>
        </div>

        {showNotifyOptIn ? (
          <label className="issue-disclaimer-modal__check issue-disclaimer-modal__check--notify">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            <span>
              This date is in the future — email me when it&rsquo;s ready to
              finalize.
            </span>
          </label>
        ) : null}

        <label className="issue-disclaimer-modal__check">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>I have read and accept the above.</span>
        </label>

        <div className="issue-disclaimer-modal__actions">
          <button
            type="button"
            className="issue-disclaimer-modal__btn issue-disclaimer-modal__btn--ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="issue-disclaimer-modal__btn issue-disclaimer-modal__btn--primary"
            disabled={!accepted}
            onClick={() => onConfirm(showNotifyOptIn && notify)}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
