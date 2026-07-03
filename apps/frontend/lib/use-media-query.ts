import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks whether a CSS media query currently matches, the React-18 way.
 *
 * Replaces the "read `matchMedia` in an effect and `setState`" pattern, which
 * triggers a cascading render on mount. SSR-safe: the server snapshot is always
 * `false`, matching the pre-hydration markup, so there is no hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
