'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
    if (isDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscard(false);
    onClose();
  }, [onClose]);

  // Reset the confirmation when the popup itself closes/reopens.
  useEffect(() => {
    if (!isOpen) setShowDiscard(false);
  }, [isOpen]);

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
            <button type="button" className="gep-close" onClick={handleClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="gep-body">
            {children}
          </div>
          <div className="gep-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn-save" onClick={onSave} disabled={!isDirty || isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
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
