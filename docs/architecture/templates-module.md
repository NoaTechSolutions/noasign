# Templates Module — Capa 1 (template selection + preview)

Status: **implemented LOCAL** (not pushed). Commits on `develop`: `13459ff`
(backend), `f722c37` (frontend). Owner validation in LOCAL pending before staging.

## Why

The render engine + the global template catalog already existed, but there was
**no UI for the user to CHOOSE their template** — it could only be set by
technical id (as done on staging with `master@`). This module gives a
receipt-type user a screen to pick their active receipt design, with visual
previews.

Layered plan (owner-approved):

- **Capa 1 (this):** selection screen + preview + new receipts use the active
  template. Common form fields stay as-is.
- **Capa 2 (later):** dynamic per-template form (each design loads its own
  fields). Not built yet.

## Data model (unchanged)

Three existing models drive it (see `prisma/schema.prisma`):

- `ReceiptTemplateStandard` — global catalog of designs (slug, `renderMode`,
  `basePdfPath`, `fieldMappingJson`, `category`, `isDefault`).
- `ReceiptTemplate` — per-tenant instance provisioned from a standard
  (`standardId`). What the PDF engine consumes; `Document.receiptTemplateId`
  points here.
- `CompanyTemplate` — tenant↔template eligibility; `isDefault=true` marks the
  active one per `category`. Source of truth for "which template is active".

**No schema change** was needed for Capa 1.

## Backend

New `TemplatesModule` (`apps/backend/src/templates/`):

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/templates?category=RECEIPT` | JWT | Catalog for the category; each item has `isActive` (tenant's selection) + `previewUrl`. |
| PATCH | `/templates/active` `{category, slug}` | JWT | Set the tenant's active template. Returns `{message, templates[]}`. |
| GET | `/templates/previews/:file` | **public** | Pre-generated PNG preview (path-traversal guarded). Public so an `<img>` loads it cross-origin without a cookie. |

`PATCH` (not `PUT`): the app's CORS allowlist (`main.ts`) and update convention
use `PATCH`; a `PUT` preflight is rejected by the browser ("Failed to fetch").

### Selection strategy — A-lite (provision-on-select)

Pure "resolve directly from the standard" was rejected: `Document.receiptTemplateId`
is a FK to `receipt_templates` (per-tenant instance), so it would need a
`Document` schema migration (risky given local migration drift).

Instead, `setActive` **provisions-or-reuses** a per-tenant `ReceiptTemplate`
cloned from the chosen standard, then points `CompanyTemplate.isDefault` at that
instance. `Document.receiptTemplateId` stays a valid FK — no schema change.

### Resolver

`ReceiptsService.resolveActivePdfTemplate` now **always prefers** the tenant's
`CompanyTemplate` default, falling back to the legacy "newest active per-tenant
template" when none exists. The env-flag gate (`RECEIPT_TEMPLATE_RESOLVER_V2`)
was removed. Safe everywhere:

- LOCAL: backfill `20260706160000` seeded each tenant a default == the legacy
  pick → no-op until the user selects a different template.
- staging/prod: backfill has NOT run → no `CompanyTemplate` rows → pure legacy,
  zero behavior change.

### Previews

The backend had **no PDF→image rasterizer**. Added `pdf-to-img` (pdfjs +
`@napi-rs/canvas`, prebuilt — no node-gyp) as a **devDependency**.

`scripts/dev-helpers/gen-template-thumbnails.js` renders each active RECEIPT
standard with the **real** `ReceiptPdfService` + sample data, rasterizes page 1,
and writes `assets/templates/previews/<slug>.png`. Re-run it after adding a
template. PNGs are committed.

## Frontend

New panel `components/dashboard/panels/v2/templates/`:

- `TemplatesPanel.tsx` — self-fetches the list, renders the card grid, handles
  activation (PATCH), loading/error/empty states, toasts.
- `TemplateCard.tsx` — preview `<img>` (`${API_URL}${previewUrl}`), name,
  description, "Active" badge + brand ring on the selection, "Set as active"
  otherwise, in-flight spinner.
- `templates-panel.css` — co-located, token-driven, theme-aware.

Wiring: nav item in `NavigationItems.tsx` (after "Clients"), panel key
`templates` registered in `app/dashboard/page.tsx`, export in the `v2` barrel.

The receipt creation form is **untouched** — new receipts already use the
tenant's active template because the backend resolves it server-side.

## How to test locally

1. Backend up (`:3000`), frontend up (`:3001`). Ensure the catalog is seeded:
   `node scripts/seed-template-catalog.js` (idempotent). Regenerate previews if
   needed: `node scripts/dev-helpers/gen-template-thumbnails.js` (needs a build).
2. Log in as a receipt user, e.g. `ana.martinez@worldpaversco.test` / `secret123`
   (World Pavers). Go to the **Templates** item in the sidebar.
3. You see the 4 receipt designs with previews; the active one has a green
   "Active" badge. Click **Set as active** on another → toast "Active template
   updated", the badge moves.
4. Create a receipt (Documents → new receipt) and confirm the generated PDF uses
   the selected design (e.g. selecting "Basic (checkboxes)" yields the "N° NNNN"
   number format + checkbox layout).

### Verified (this build)

- Public preview `200 image/png`; bad slug `400`; missing `404`; guarded routes
  `401` without auth.
- Auth flow: login → list (correct `isActive`) → PATCH flips the active → new
  receipt rendered with the active template (basic-v1 active → number `N° 0051`,
  instance maps to `receipt-basic-v1`).
- UI (Edge): screen renders, click moves the active selection with a success
  toast, zero console errors.

## Round 2 — owner adjustments (validated Capa 1)

Commits `1c4d46f` (backend), `2b346f1` (frontend).

- **Always one active (invariant).** `listForCategory` self-heals: a tenant with
  zero active default gets the catalog default forced (shared `applyActive`
  helper). Idempotent — never overrides an explicit/custom choice. Guarantees the
  screen always shows exactly one selected template.
- **Auto-cropped previews.** Thumbnails are cropped to the receipt band (not the
  full Letter page): scan the render for the non-white content bbox, and drop the
  ntssign branding footer by cutting at the largest white gap that still has
  content below. Per-design, zero config (`@napi-rs/canvas`). Each receipt sits
  in a different band and is handled automatically.
- **Category tabs.** "Recibos" (the grid) + "Invoice" (a "coming soon"
  placeholder, no fetch). Config-array driven — a 3rd category is a one-line add.
- **"Personaliza tu recibo" CTA.** Prominent accent button, VISUAL ONLY → shows a
  "Coming soon" toast. Owner finalizes copy/flow later.
- **Cleaner cards.** Removed the per-card description and the screen subtitle;
  cards show only preview + name + status. Media box is fixed-height with
  `object-fit: contain` so the varying-aspect cropped previews stay even.

## Round 3 — card redesign + Preview modal

Commits `082178d` (backend), `90f6919` (frontend).

- **Horizontal cards, 2 per row.** Each card is landscape: the cropped receipt
  band as a left media column + name/status/actions on the right. Collapses to 1
  column on narrow screens. Card = design-system feature card.
- **Preview modal.** Each card has a "Preview" button opening a modal (portal)
  that shows the **full Letter-page render** of the document. Backend now emits
  `fullPreviewUrl` (`<slug>-full.png`) next to `previewUrl` (`<slug>.png`, the
  crop). The gen script writes both from the same engine + sample data.
- **Design-system styling.** Amber secondary CTA (#ff9900 / hover #cc7a00), ghost
  navy "Preview", primary navy "Set as active", navy-opacity tabs.
- **Theming gotcha (fixed).** Dark styles must be scoped to
  `:root[data-theme="dark"]` ONLY. The `<html>` element carries a stale `.dark`
  class even in light mode (`data-theme` is the real source of truth), so keying
  dark styles off `.dark` renders dark cards in light mode. Convention matches
  the other v2 panels (which use `[data-theme="dark"]`). Verified in both modes.

## Not in scope / next

- **Capa 2:** dynamic per-template form (fields per design). Owner confirmed the
  3 receipts will diverge later.
- INVOICE category: endpoints already accept `category=INVOICE` generically; the
  screen is RECEIPT-only for now and receipt creation hardcodes `RECEIPT`.
