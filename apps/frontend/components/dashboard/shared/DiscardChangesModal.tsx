'use client';

import React, { useEffect } from 'react';

interface DiscardChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscardChangesModal({ isOpen, onConfirm, onCancel }: DiscardChangesModalProps) {
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
        aria-labelledby="discard-title"
        aria-describedby="discard-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="discard-title" className="discard-modal__title">Discard changes?</h3>
        <p id="discard-desc" className="discard-modal__desc">
          You have unsaved changes. If you leave now, they will be lost.
        </p>
        <div className="discard-modal__actions">
          <button type="button" className="discard-modal__btn discard-modal__btn--cancel" onClick={onCancel}>
            Keep editing
          </button>
          <button type="button" className="discard-modal__btn discard-modal__btn--confirm" onClick={onConfirm}>
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
