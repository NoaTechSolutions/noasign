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
}

export function WizardBottomBar({
  isLastSection,
  isSubmitting,
  canSubmit,
  tabError,
  onCancel,
  onContinue,
  onSubmit,
}: WizardBottomBarProps) {
  const disabledSubmit = isSubmitting || !canSubmit;
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
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabledSubmit}
            className={`wizard-btn wizard-btn--primary${disabledSubmit ? ' wizard-btn--primary-disabled' : ''}`}
          >
            {isSubmitting ? 'Creating...' : 'Create draft'}
          </button>
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
