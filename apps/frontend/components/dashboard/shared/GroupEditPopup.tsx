'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { useBeforeUnload } from '@/lib/use-before-unload';
import { DiscardChangesModal } from './DiscardChangesModal';
import './group-edit-popup.css';

interface GroupEditPopupProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isDirty: boolean;
  isSaving?: boolean;
  /** Widen the panel (e.g. Contract edit with Finance ON → 2x2 grid needs room). */
  wide?: boolean;
  children: React.ReactNode;
}

export function GroupEditPopup({
  title,
  isOpen,
  onClose,
  onSave,
  isDirty,
  isSaving = false,
  wide = false,
  children,
}: GroupEditPopupProps) {
  useBlockScroll(isOpen);
  // Native reload/close prompt while there are unsaved changes.
  useBeforeUnload(isOpen && isDirty);

  // "Discard changes?" confirmation (styled modal — replaces window.confirm).
  const [showDiscard, setShowDiscard] = useState(false);

  const handleClose = useCallback(() => {
    // While a save is in flight the popup is "closed" behind the saving card and
    // must not be dismissable (overlay / Escape / X) — the outcome drives what
    // happens next: success unmounts us, failure re-shows the form intact.
    if (isSaving) return;
    if (isDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  }, [isSaving, isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscard(false);
    onClose();
  }, [onClose]);

  // Reset the confirmation when the popup itself closes/reopens. Done during
  // render via a prev-value compare — the canonical replacement for an effect
  // that only adjusts state in response to another value changing.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen && showDiscard) setShowDiscard(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      // While the discard prompt is up, let it own Escape (its own handler).
      if (e.key === 'Escape' && !showDiscard) handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose, showDiscard]);

  if (!isOpen) return null;

  return (
    <>
      <div className="gep-overlay" onClick={handleClose}>
        <div
          className={`gep-panel${wide ? ' gep-panel--wide' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gep-header">
            <h3 className="gep-title">{title}</h3>
            {/* Hidden while saving — the popup can't be dismissed mid-flight. */}
            {isSaving ? null : (
              <button type="button" className="gep-close" onClick={handleClose} aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
          {isSaving ? (
            // Saving state: the form is replaced by a blocking card so nothing can
            // be touched. On success the parent unmounts this popup; on failure it
            // rejects → isSaving flips back to false and the form (with the user's
            // typed values intact) reappears with the error. See saas-ux-patterns §5.
            <div className="gep-saving" role="status" aria-live="polite">
              <Loader2 className="gep-saving__spinner" size={30} aria-hidden="true" />
              <p className="gep-saving__label">Saving…</p>
            </div>
          ) : (
            <>
              <div className="gep-body">
                {children}
              </div>
              <div className="gep-footer">
                <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
                <button type="button" className="btn-save" onClick={onSave} disabled={!isDirty}>
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rendered as a sibling (NOT inside .gep-overlay) so its backdrop click
          doesn't bubble to the overlay's handleClose. z-index 1500 > 1100. */}
      <DiscardChangesModal
        isOpen={showDiscard}
        onConfirm={confirmDiscard}
        onCancel={() => setShowDiscard(false)}
      />
    </>
  );
}
