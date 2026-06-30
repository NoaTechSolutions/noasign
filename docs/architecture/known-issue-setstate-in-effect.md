# Known issue — `setState` synchronously inside an effect

**Status (2026-06-30): RESOLVED across the frontend.** `frontend-lint` is green
(0 errors) and every `react-hooks/set-state-in-effect` violation is either fixed
with the pattern that fits its cause or left as a deliberate, documented
external-store read (4 cases, see "Remaining" below).

## What

`setState` called synchronously in a `useEffect` body triggers a **second,
cascading render** right after the first — wasted work, and usually a smell that
the state should be *derived during render* or read from an *external store*
instead of synced via an effect. React's `react-hooks/set-state-in-effect` rule
flags it (see <https://react.dev/learn/you-might-not-need-an-effect>). It is not a
crash or data bug — the UI works; it just renders twice more often than needed and
can flicker.

## Patterns used to fix it

There is no single fix — each instance is resolved with the pattern that matches
*why* it was wrong:

| Cause | Correct pattern | Helper |
|---|---|---|
| Reset/adjust state when another value changes | prev-value compare **during render** | — |
| Copy a `keyof T` union write | typed generic key helper (no `as any`) | — |
| Read a media query | `useSyncExternalStore` | `lib/use-media-query.ts` (`useMediaQuery`) |
| Hydration "mounted" guard | `useSyncExternalStore` | `lib/use-is-hydrated.ts` (`useIsHydrated`) |
| Persisted state in `localStorage` | `useSyncExternalStore` | `lib/use-local-storage-state.ts` (`useLocalStorageState`) |
| Loading flag before a fetch | initialise the flag `true`; restart on dep change via prev-compare | — |

`useSyncExternalStore` gotcha: `getSnapshot` must return a **stable primitive**.
For object values, snapshot the raw JSON *string* and parse it in a memo — never
return a freshly-parsed object, or React loops forever.

## Resolved instances

- `customers-panel.tsx` — derive the effective tab during render.
- `ProfilePanel.tsx` — sync drafts during render via the prev-ref pattern; the two
  `as any` indexed writes now go through a typed key helper.
- `Sidebar.tsx` — persisted collapse/open-groups state moved to
  `useLocalStorageState` (`useSyncExternalStore`). SSR-safe, no hydration mismatch,
  `eslint-disable` removed.
- `CustomersToolbar.tsx` — `isMobile` via `useMediaQuery`.
- `theme-toggle.tsx` (both the `ui/` and login variants) — mounted guard via
  `useIsHydrated`.
- `DashboardThemeProvider.tsx` — persisted theme read via `useSyncExternalStore`;
  the `data-theme` DOM write stays in an effect (allowed external-system sync).
- `CustomerTableRow.tsx`, `GroupEditPopup.tsx` — reset-on-close via prev-compare.
- `AssignCustomerModal.tsx` — dropped a redundant `setLoading(true)` (state inits
  `true`).
- `DocumentDetailSidebar.tsx` — `versionsLoading` inits from `onFetchVersions` and
  restarts on in-place document swaps via prev-compare; removes a one-frame flash.
- `ui/sidebar.tsx`, `dashboard-sidebar-demo.tsx` (URL→section sync,
  section→menu auto-open) — `useIsHydrated` / prev-compare.

## Remaining (deliberate, deferred)

Four suppressions are left in place — each reads from `localStorage` /
`sessionStorage` on mount with a fallback, which is a documented, React-sanctioned
external-store read (issue #418 hydration safety). They are conscious tradeoffs,
not accidental. Three of the original four were migrated on 2026-06-30:

| File | Reads | Migration |
|---|---|---|
| `marketing/LandingContext.tsx` | `localStorage` lang + `navigator.language` fallback | ✅ `useSyncExternalStore` (lang store) |
| `marketing/FloatingControls.tsx` | `localStorage` theme + `matchMedia` fallback | ✅ `useSyncExternalStore`; DOM swap stays in an effect |
| `dashboard/panels/billing-panel.tsx` | `sessionStorage` modal-open boolean | ✅ new `useSessionStorageState` (`lib/use-session-storage-state.ts`) |

### Still deferred (one, higher-risk)

`dashboard-sidebar-demo.tsx` (~line 673) restores the document-viewer state — **3
separate states** (`documentViewerOpen`, `documentViewerInitialTab`,
`documentViewerInitialEditingTab`) from a **single** `sessionStorage` JSON object
on mount, and the states are also independently set by user actions. It lives in
the core dashboard. A clean migration means making the viewer state one store
object (or one `useSessionStorageState<PersistedDocumentViewerState>`) and deriving
the three values — a larger refactor with reload-restore behavior that needs a
manual smoke test. Left suppressed deliberately, pending owner sign-off; it is the
remaining scope of a "finish the external-store migration" change.
