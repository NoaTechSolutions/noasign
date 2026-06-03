'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DiscardChangesModal } from './DiscardChangesModal';

interface DirtyFormContextValue {
  /** True when the current open form has unsaved user edits. */
  isDirty: boolean;
  /** Forms call this on field changes / on submit / on discard. */
  setDirty: (dirty: boolean) => void;
  /**
   * Call to perform a navigation/close action that should be guarded by the
   * "Discard changes?" prompt when the form is dirty.
   *  - If !isDirty: runs `proceed()` immediately.
   *  - If isDirty: opens the modal; `proceed()` runs if the user confirms
   *    discard, and `isDirty` is reset to false.
   */
  requestNavigate: (proceed: () => void) => void;
}

const DirtyFormContext = createContext<DirtyFormContextValue | null>(null);

export function useDirtyForm() {
  const ctx = useContext(DirtyFormContext);
  if (!ctx) {
    throw new Error('useDirtyForm must be used within a DirtyFormProvider');
  }
  return ctx;
}

/** Optional fallback that returns no-ops when no provider is mounted — handy
 *  in unit tests or storybook stories. Components inside the dashboard tree
 *  should use `useDirtyForm` directly. */
export function useDirtyFormOptional(): DirtyFormContextValue {
  const ctx = useContext(DirtyFormContext);
  return ctx ?? {
    isDirty: false,
    setDirty: () => {},
    requestNavigate: (p) => p(),
  };
}

export function DirtyFormProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirtyState] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirtyState(dirty);
  }, []);

  const requestNavigate = useCallback(
    (proceed: () => void) => {
      if (isDirty) {
        pendingActionRef.current = proceed;
        setWarningOpen(true);
      } else {
        proceed();
      }
    },
    [isDirty],
  );

  const handleConfirmDiscard = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setWarningOpen(false);
    setIsDirtyState(false);
    if (action) action();
  }, []);

  const handleCancelDiscard = useCallback(() => {
    pendingActionRef.current = null;
    setWarningOpen(false);
  }, []);

  // Browser reload/close warning while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return (
    <DirtyFormContext.Provider value={{ isDirty, setDirty, requestNavigate }}>
      {children}
      <DiscardChangesModal
        isOpen={warningOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </DirtyFormContext.Provider>
  );
}
