'use client';

import { useCallback, useState } from 'react';

// SaaS-wide §9 (saas-ux-patterns): animated row exit on delete. The row whose id
// === removingId fades + slides out (~300ms, honoring prefers-reduced-motion)
// before the list reloads and drops it — so it never vanishes abruptly. Single
// source: tables/cards apply the shared `.row-exiting` class (globals.css) to
// that row; this hook owns the id + the timing. Keep the duration in sync with
// the `.row-exiting` animation.
const ROW_EXIT_MS = 300;

export function useRowExit() {
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Mark `id` as exiting, wait for the animation, then run `afterExit` and clear.
  // Two call shapes:
  //  - delete-first (customers): await onDelete(id); await animateRemoval(id, reload)
  //  - delete-bundled (documents): await animateRemoval(id, () => onDelete(id))
  //    where onDelete already deletes AND reloads — the row animates, then it lands.
  const animateRemoval = useCallback(
    async (id: string, afterExit: () => void | Promise<void>) => {
      setRemovingId(id);
      await new Promise((resolve) => setTimeout(resolve, ROW_EXIT_MS));
      await afterExit();
      setRemovingId(null);
    },
    [],
  );

  return { removingId, animateRemoval };
}
