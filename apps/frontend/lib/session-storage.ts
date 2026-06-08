/**
 * Session storage utilities for NTSsign.
 * Type-safe wrappers for sessionStorage operations.
 *
 * FASE 3.5 — moved from `components/dashboard-sidebar-demo.tsx`.
 * Implementations are byte-for-byte copies of the originals.
 */

export function readSessionBoolean(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.sessionStorage.getItem(key) === "true";
}

export function writeSessionBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, value ? "true" : "false");
}
