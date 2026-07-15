'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
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
  /** K3: after a successful save, show a brief "Saved!" flourish before the parent
   *  closes the popup. Opt-in (invoice/receipt edits); contracts leave it unset and
   *  keep their toast. */
  isSaved?: boolean;
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
  isSaved = false,
  wide = false,
  children,
}: GroupEditPopupProps) {
  useBlockScroll(isOpen);
  // Native reload/close prompt while there are unsaved changes.
  useBeforeUnload(isOpen && isDirty);

  // "Discard changes?" confirmation (styled modal — replaces window.confirm).
  const [showDiscard, setShowDiscard] = useState(false);

  const handleClose = useCallback(() => {
    // While a save/success card is up the popup can't be dismissed (overlay /
    // Escape / X) — the outcome drives what happens next.
    if (isSaving || isSaved) return;
    // J3: ALWAYS confirm before closing/force-closing (owner preference) — even
    // with no changes — so an accidental dismiss never drops the editor silently.
    setShowDiscard(true);
  }, [isSaving, isSaved]);

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
            {/* Hidden while saving/success — can't be dismissed mid-flight. */}
            {isSaving || isSaved ? null : (
              <button type="button" className="gep-close" onClick={handleClose} aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
          {isSaved ? (
            // K3: brief success flourish before the parent closes the popup.
            <div className="gep-saving gep-saving--success" role="status" aria-live="polite">
              <CheckCircle2 className="gep-saving__icon" size={38} aria-hidden="true" />
              <p className="gep-saving__label">Saved!</p>
            </div>
          ) : isSaving ? (
            // Saving state: the form is replaced by a blocking card (progress bar)
            // so nothing can be touched. On failure the parent flips isSaving back
            // to false and the form reappears (values intact) with the error.
            <div className="gep-saving" role="status" aria-live="polite">
              <div className="gep-progress"><div className="gep-progress__bar" /></div>
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
        hasChanges={isDirty}
      />
    </>
  );
}
