'use client';

import React from 'react';

interface WizardBottomBarProps {
  isLastSection: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  tabError: string;
  onCancel: () => void;
  onContinue: () => void;
  onSubmit: () => void;
  // Label of the final submit button (defaults to "Create draft").
  submitLabel?: string;
  // Optional SECOND primary action on the last section (e.g. "Create and send").
  // When present, the primary submit becomes the secondary/outline button and
  // this one takes the filled primary style (mirrors the receipt form footer).
  onSend?: () => void;
  sendLabel?: string;
}

export function WizardBottomBar({
  isLastSection,
  isSubmitting,
  canSubmit,
  tabError,
  onCancel,
  onContinue,
  onSubmit,
  submitLabel = 'Create draft',
  onSend,
  sendLabel = 'Create and send',
}: WizardBottomBarProps) {
  const disabledSubmit = isSubmitting || !canSubmit;
  const submitClass = onSend ? 'wizard-btn--secondary' : 'wizard-btn--primary';
  return (
    <div className="wizard-bottom-bar">
      {tabError ? (
        <div className="wizard-bottom-bar__error" role="alert">
          {tabError}
        </div>
      ) : null}
      <div className="wizard-bottom-bar__actions">
        <button
          type="button"
          onClick={onCancel}
          className="wizard-btn wizard-btn--secondary"
        >
          Cancel
        </button>
        {isLastSection ? (
          <>
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabledSubmit}
              className={`wizard-btn ${submitClass}${disabledSubmit ? ' wizard-btn--primary-disabled' : ''}`}
            >
              {isSubmitting ? 'Creating...' : submitLabel}
            </button>
            {onSend ? (
              <button
                type="button"
                onClick={onSend}
                disabled={disabledSubmit}
                className={`wizard-btn wizard-btn--primary${disabledSubmit ? ' wizard-btn--primary-disabled' : ''}`}
              >
                {isSubmitting ? 'Sending...' : sendLabel}
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            className="wizard-btn wizard-btn--primary"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
