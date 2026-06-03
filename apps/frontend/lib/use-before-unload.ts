import { useEffect } from 'react';

/**
 * Shows the browser's native "leave site?" prompt on reload / tab close while
 * `enabled` is true (e.g. an edit popup has unsaved changes). No-op when false.
 */
export function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers to actually trigger the prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
