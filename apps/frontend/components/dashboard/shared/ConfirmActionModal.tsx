'use client';

import React, { useEffect } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** 'amber' for forward/positive actions (Send), 'danger' for destructive (Cancel). */
  variant?: 'amber' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation dialog (separate from DiscardChangesModal, which is
 * unsaved-changes specific). Backdrop blur + scroll lock; Escape cancels.
 */
export function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'amber',
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  useBlockScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Stop the underlying detail modal's window-level Escape→close from
        // also firing (document bubbles before window). Otherwise one Escape
        // would dismiss both the confirm AND the modal behind it.
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-action-overlay" onClick={onCancel}>
      <div
        className="confirm-action-modal"
        role="alertdialog"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-action-title" className="confirm-action-modal__title">
          {title}
        </h3>
        <p id="confirm-action-desc" className="confirm-action-modal__desc">
          {message}
        </p>
        <div className="confirm-action-modal__actions">
          <button
            type="button"
            className="confirm-action-modal__btn confirm-action-modal__btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-action-modal__btn confirm-action-modal__btn--${variant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
