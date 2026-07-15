'use client';

import React, { useEffect } from 'react';

interface DiscardChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** J3: the popup always confirms on close. When there are NO unsaved changes the
   *  copy shifts from "discard changes" to a neutral "close this editor?" so it
   *  never claims changes that don't exist. Defaults to true (backward compatible). */
  hasChanges?: boolean;
}

export function DiscardChangesModal({
  isOpen,
  onConfirm,
  onCancel,
  hasChanges = true,
}: DiscardChangesModalProps) {
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
        <h3 id="discard-title" className="discard-modal__title">
          {hasChanges ? 'Discard changes?' : 'Close editor?'}
        </h3>
        <p id="discard-desc" className="discard-modal__desc">
          {hasChanges
            ? 'You have unsaved changes. If you leave now, they will be lost.'
            : 'Are you sure you want to close this editor?'}
        </p>
        <div className="discard-modal__actions">
          <button type="button" className="discard-modal__btn discard-modal__btn--cancel" onClick={onCancel}>
            Keep editing
          </button>
          <button type="button" className="discard-modal__btn discard-modal__btn--confirm" onClick={onConfirm}>
            {hasChanges ? 'Discard changes' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
