import { useEffect } from 'react';

/**
 * Blocks background scroll while the calling component is mounted.
 *
 * Compensates the page width for the scrollbar that was hiding when
 * overflow goes to "hidden", so the layout doesn't shift sideways when
 * a modal opens. Snapshots the original body inline styles and restores
 * them on unmount — safe to compose with other components that read or
 * mutate body.style.
 *
 * Use this in every modal/dialog/drawer that visually covers the page.
 */
export function useBlockScroll(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [active]);
}
