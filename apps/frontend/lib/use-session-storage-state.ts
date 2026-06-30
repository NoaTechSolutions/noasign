import { useCallback, useMemo, useSyncExternalStore } from 'react';

// sessionStorage twin of useLocalStorageState. One event backs every instance so
// hooks reading the same key re-render within the tab on a write. Tab-local on
// purpose (sessionStorage is per-tab anyway), matching the read-once-on-mount
// behavior it replaces.
const SESSION_STORAGE_EVENT = 'ntssign-session-storage';

function subscribe(onStoreChange: () => void) {
  window.addEventListener(SESSION_STORAGE_EVENT, onStoreChange);
  return () => window.removeEventListener(SESSION_STORAGE_EVENT, onStoreChange);
}

function readRaw(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
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
 * A sessionStorage-backed state hook built on useSyncExternalStore — the
 * canonical replacement for the "read sessionStorage in an effect and setState"
 * pattern (react-hooks/set-state-in-effect, #418).
 *
 * SSR-safe: the server snapshot is the default, so there is no `window` access
 * during render and no hydration mismatch. The raw JSON string is the snapshot (a
 * stable primitive, so change detection never loops); parsing is memoized. The
 * JSON encoding is wire-compatible with the readSessionBoolean/writeSessionBoolean
 * helpers ("true"/"false") and with readSessionJson. Pass a referentially stable
 * `defaultValue` (a module constant) for object values.
 */
export function useSessionStorageState<T>(
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
        window.sessionStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* ignore quota / unavailable storage */
      }
      window.dispatchEvent(new Event(SESSION_STORAGE_EVENT));
    },
    [key, defaultValue],
  );

  return [value, setValue];
}
