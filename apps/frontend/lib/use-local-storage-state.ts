import { useCallback, useMemo, useSyncExternalStore } from 'react';

// One event backs every useLocalStorageState instance: a write dispatches it so
// other hooks reading the same key re-render within the tab. Kept tab-local on
// purpose (no 'storage' listener) to match the read-once-on-mount behavior it
// replaces — cross-tab sync would be a behavior change.
const LOCAL_STORAGE_EVENT = 'ntssign-local-storage';

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LOCAL_STORAGE_EVENT, onStoreChange);
  return () => window.removeEventListener(LOCAL_STORAGE_EVENT, onStoreChange);
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * A localStorage-backed state hook built on useSyncExternalStore.
 *
 * SSR-safe: the server snapshot is the default, so there is no `window` access
 * during render and no hydration mismatch (the stored value is adopted right
 * after hydration). This is the canonical replacement for the
 * "read localStorage in an effect and setState" pattern, which the
 * react-hooks/set-state-in-effect rule flags.
 *
 * The raw JSON string is the external snapshot — a stable primitive, so React's
 * change detection never loops on a freshly-parsed object. Parsing happens in a
 * memo keyed on that string. For object values, pass a referentially stable
 * `defaultValue` (a module constant) so the default keeps a steady identity.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const getSnapshot = useCallback(() => readRaw(key), [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const value = useMemo<T>(() => parse(raw, defaultValue), [raw, defaultValue]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(parse(readRaw(key), defaultValue))
          : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* ignore quota / unavailable storage */
      }
      window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
    },
    [key, defaultValue],
  );

  return [value, setValue];
}
