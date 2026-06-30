# Known issue — `setState` synchronously inside an effect

**Status:** open, deferred (low severity). Logged for a focused follow-up — do
NOT bundle the fix into unrelated PRs.

## What

Three dashboard components call `setState` synchronously in a `useEffect` body.
React's `react-hooks/set-state-in-effect` rule (and the React docs,
<https://react.dev/learn/you-might-not-need-an-effect>) flag this: it triggers a
**second, cascading render** right after the first — wasted work, and a smell
that the state should be *derived during render* instead of synced via an effect.

It is **not** a crash or data bug. It's a performance / correctness-smell. The UI
works today; it just renders twice more often than needed and can flicker.

## Where (3 instances)

| File | Line | Effect does | Trigger |
|---|---|---|---|
| `components/dashboard/layout/Sidebar.tsx` | ~57 | reads `localStorage` on mount and `setIsCollapsed` / `setOpenGroups` | mount |
| `components/dashboard/panels/customers-panel.tsx` | ~1077 | snaps `activeTab` to a valid tab when the async `customer` resolves and the current tab becomes invalid | `customer` loads (null → business/personal) |
| `components/dashboard/panels/v2/ProfilePanel.tsx` | ~82 | copies the `user` / `companyProfile` props into `draftUser` / `draftCompany` state | those props change |

## Why it happens

All three are the same anti-pattern in different clothes: **state that is really
a function of props/external data is being *synced* with an effect** instead of
*derived during render* (or initialized lazily).

- `customers-panel` / `ProfilePanel` — classic "copy props to state" / "adjust
  state when a prop changes".
- `Sidebar` — "initialize state from `localStorage`", kept in an effect partly to
  stay SSR/hydration-safe (no `window` on the server).

## Proposed fix (per instance)

1. **customers-panel `activeTab`** — derive the effective tab during render and
   drop the effect entirely:
   ```ts
   const validKeys = isBusiness ? ["company","contact","documents"] : ["info","documents"];
   const effectiveTab = validKeys.includes(activeTab) ? activeTab : validKeys[0];
   // use effectiveTab for rendering; only setActiveTab from user clicks.
   ```
   This removes the cascading render and the "snap-back flicker".

2. **ProfilePanel `draftUser` / `draftCompany`** — these are edit drafts. Prefer
   the **key-reset pattern** (give the editing subtree a `key={user.id}` so it
   remounts with fresh `useState(user)` initial state), or set-during-render
   guarded by a "previous id" ref. Avoids the per-prop-change effect+setState.

3. **Sidebar `localStorage`** — move the read into a **lazy `useState`
   initializer** guarded for SSR, e.g.
   `useState(() => typeof window === "undefined" ? false : localStorage.getItem(KEY) === "true")`,
   or formalize it with `useSyncExternalStore`. Watch for hydration mismatch —
   verify the server and first client render agree.

## Effort / risk

Small per file, but each touches interactive UI (tabs, profile editing, sidebar
persistence) → needs a manual smoke test after. Best done as one dedicated
"derive-don't-sync" cleanup PR, not piggybacked on a feature.
