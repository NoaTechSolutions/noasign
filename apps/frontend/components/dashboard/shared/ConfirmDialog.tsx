'use client';

import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic styled confirmation dialog — the custom replacement for window.confirm.
 * Reuses the global .discard-modal styles (defined in app/globals.css). For the
 * unsaved-changes case use DiscardChangesModal; this is for everything else
 * (sign out, destructive confirms, etc.) so no native browser dialog is shown.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="discard-modal-overlay" onClick={onCancel}>
      <div
        className="discard-modal"
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="discard-modal__title">{title}</h3>
        <p id="confirm-dialog-desc" className="discard-modal__desc">{message}</p>
        <div className="discard-modal__actions">
          <button
            type="button"
            className="discard-modal__btn discard-modal__btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="discard-modal__btn discard-modal__btn--confirm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
