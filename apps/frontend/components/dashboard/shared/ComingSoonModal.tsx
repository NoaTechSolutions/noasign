'use client';

import React, { useEffect } from 'react';
import { Wrench } from 'lucide-react';
import './coming-soon-modal.css';

interface ComingSoonModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}

/**
 * "Coming soon / under construction" popup — a friendly heads-up for features
 * that are visible in the UI but not wired up yet (e.g. the History link on the
 * overview status card). Single dismiss button, no destructive action.
 * Reuses the global overlay blur via the shared "-overlay" suffix.
 */
export function ComingSoonModal({
  isOpen,
  title = 'Coming soon',
  message,
  buttonLabel = 'Got it',
  onClose,
}: ComingSoonModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="coming-soon-overlay" onClick={onClose}>
      <div
        className="coming-soon-modal"
        role="alertdialog"
        aria-labelledby="coming-soon-title"
        aria-describedby="coming-soon-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="coming-soon-modal__icon" aria-hidden="true">
          <Wrench size={26} strokeWidth={1.75} />
        </span>
        <h3 id="coming-soon-title" className="coming-soon-modal__title">
          {title}
        </h3>
        <p id="coming-soon-desc" className="coming-soon-modal__desc">
          {message}
        </p>
        <button
          type="button"
          className="coming-soon-modal__btn"
          onClick={onClose}
          autoFocus
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
