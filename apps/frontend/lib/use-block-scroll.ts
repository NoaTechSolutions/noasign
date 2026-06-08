import { useEffect } from 'react';

// Module-level reference count so overlapping/nested modals compose safely.
// The previous version snapshotted body.style on every mount and restored it on
// unmount — with two modals open at once, the inner one snapshotted the OUTER's
// "hidden" value, so when both closed the body was left overflow:hidden (the
// page scroll stayed locked). Counting active locks and only restoring when the
// LAST one releases fixes that whole class of races.
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/**
 * Blocks background scroll while the calling component is mounted (or while
 * `active` is true). Compensates the scrollbar width to avoid a sideways shift.
 *
 * Safe to nest/overlap: the original body styles are captured on the first lock
 * and restored only when the last lock releases.
 *
 * Use this in every modal/dialog/drawer that visually covers the page.
 */
export function useBlockScroll(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;

    if (lockCount === 0) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      savedOverflow = document.body.style.overflow;
      savedPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [active]);
}
