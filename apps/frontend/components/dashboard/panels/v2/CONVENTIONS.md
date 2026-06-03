# Dashboard V2 — Panel Conventions

## Panel headers

- **Title**: always present. May be static (e.g. "Documents", "Billing") or
  dynamic (e.g. the Overview welcome "Welcome back, {name}", the Profile name).
- **Subtitle**: **NEVER**. Panel headers have a title only — no descriptive
  tagline / `panel-head__sub` / `*-head__sub` line under the title. This applies
  to every panel, past and future.
- **Skeleton on titles**: only when the title is **dynamic** (data-dependent).
  Static titles render immediately and need no skeleton. The two dynamic titles
  (Overview welcome, Profile name) already render skeletons via their hero cards.

> Note: this rule targets the **panel header**. It does not affect section-level
> subtitles inside reusable components (e.g. `CollapsibleSection`'s `subtitle`,
> like "Optional" on the Insurance section) or per-card metadata
> (e.g. `bill-card__sub` "Billed monthly"), which are meaningful UI, not panel
> descriptions.

## Skeleton loading

Reuse the global classes from `app/globals.css` (do **not** create new ones):

- `.skeleton-pulse` — base pulse animation (`var(--bg-hover)` background)
- `.skeleton-circle` — round (avatars, icons, status dots)
- `.skeleton-line` — text bars

Patterns:
- **Page-fed panels** (Billing, Documents, Overview, Profile): receive an
  `isLoading` prop from `page.tsx` and gate skeletons on it. Show the skeleton
  **before** any empty-state so empty states never flash during load.
- **Self-fetching panels** (Members, Customers, Locked Users): drive skeletons
  off their own internal `loading` state. For panels with auto-refresh
  (Locked Users) only skeleton the **first** fetch — silent updates afterward.
- Tables: render the same number of columns/rows as the real table so there's
  no layout jump. Only skeleton **dynamic** data, never static labels/headers.

## Card legend (group/section cards)

Fieldset-style card: the group title + icon float over the card's top-left
border. Global classes live in `app/globals.css` — reuse, don't redefine:

- `.card-legend` — the card wrapper (adds `position: relative` + a `1.5px`
  `var(--brand)` border, which is navy in light / sky in dark — theme-aware,
  no hardcoded hex).
- `.card-legend__label` — the floating title **pill** (top-left): own `1.5px`
  `var(--brand)` border + `20px` radius + solid bg, so the card border never
  slices the text. Bg = `var(--card-legend-bg, var(--bg-card))`; set
  `--card-legend-bg` on the container to match its surface (e.g. modals,
  sidebar) — Profile uses the `--bg-card` default.
- `.card-legend__icon` — lucide icon, 14px, `var(--brand)`.
- `.card-legend__title` — 11px, weight 600, uppercase, `var(--brand)`.
- `.card-legend__edit` — optional edit pencil, absolute top-right of the card
  (kept out of the floating label).

Icon-per-group reference: Identity→User, Address→MapPin, Professional
Profile→Briefcase, Online Presence→Globe, Company Details→Building2,
Contact→Phone, Insurance/Policy→Shield, Activity→Activity, Document
Info→FileText, Plan→CreditCard, Usage→BarChart2.
