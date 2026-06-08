'use client';

import React, { useEffect } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface WizardCancelDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function WizardCancelDialog({ onConfirm, onClose }: WizardCancelDialogProps) {
  useBlockScroll();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="wizard-cancel-dialog-overlay" onClick={onClose}>
      <div
        className="wizard-cancel-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wizard-cancel-dialog-title"
      >
        <h3 id="wizard-cancel-dialog-title" className="wizard-cancel-dialog__title">
          Cancel draft?
        </h3>
        <p className="wizard-cancel-dialog__message">
          If you close this now, the information entered here will be discarded.
        </p>
        <div className="wizard-cancel-dialog__actions">
          <button
            type="button"
            onClick={onClose}
            className="wizard-btn wizard-btn--secondary"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="wizard-btn wizard-btn--danger"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
