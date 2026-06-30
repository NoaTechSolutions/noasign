import { useSyncExternalStore } from 'react';

// A stable, never-firing subscription: the hydration state flips exactly once
// (server -> client) and never changes again, so there is nothing to subscribe to.
const noopSubscribe = () => () => {};

/**
 * Returns `false` during server render and the initial hydration pass, then
 * `true` once mounted on the client. The React-18 replacement for the
 * `useState(false)` + `useEffect(() => setMounted(true))` hydration guard, which
 * sets state synchronously inside an effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
