# Template alta — the checklist for adding a template

_Verified against `architecture/templates-module.md`, `product/saas-ux-patterns.md` §10, and `apps/backend/assets/templates/previews/` — 2026-07-17._

Adding a template is **not done until its preview PNG is curated.** This runbook covers both ways a tenant gets a template and the manual PNG step that closes the loop.

## Two paths, two preview outcomes

### (a) Give an existing catalog standard in exclusivity → **privatize in place**

The tenant uses a design that already exists in the catalog (e.g. `receipt-classic`, `invoice-standard-v1`). Do **not** clone it under a new slug — make the existing standard private to the tenant:

```bash
node scripts/associate-template-owner.js <slug> <companyProfileId>
```

The slug is unchanged, so its **already-committed PNG still serves**. Preview just works — no PNG step needed. This is the receipt pattern (`receipt-classic` → World Pavers) and the invoice pattern (`invoice-standard-v1` → Laura).

### (b) Bespoke per-tenant template → **new slug, needs the full alta**

A client gets their own design → a **new slug with no PNG yet**. This is the real prod case every time a client is onboarded with a custom template. It requires every step below, including the manual PNG.

---

## The checklist

1. **Seed / create the standard** in the catalog:
   ```bash
   node scripts/seed-template-catalog.js   # idempotent upsert; does NOT touch ownership or PNGs
   ```

2. **Set visibility** — global or private to one tenant:
   ```bash
   node scripts/associate-template-owner.js <slug> <companyProfileId|global>
   ```
   > ⚠️ The `companyProfileId` **differs per environment** (local / staging / prod tenant ids are not the same). The script validates the id exists in the current DB and **fails safe on a dangling id** — so passing the wrong env's id errors out instead of silently leaking a template globally.

3. **Curate the preview PNGs** — the manual step that a bespoke template (path b) needs:
   - **Files:** `<slug>.png` (the CARD image) **and** `<slug>-full.png` (the "Preview" MODAL, full page).
   - **Format / size:** PNG, **1190 × 1683 px** (a Letter page; the card box crops via CSS).
   - **Location:** `apps/backend/assets/templates/previews/` (folder is `previews`, plural). **Committed to the repo** — that's how it reaches every environment (local + staging + prod), the same way the catalog PNGs do.
   - **`git add` the PNGs** before deploying.

   > 🔴 **NEVER run `gen-template-thumbnails.js`.** The card PNGs are **owner-curated by hand**; the generator **overwrites** them. (The generator was the original mechanism, but the curated-by-hand rule supersedes it — the script's own doc contradicts itself on this; the curated rule is the correct one.)

4. **Deploy (staging), in order:**
   1. `prisma migrate deploy` (auto-applies any template migrations).
   2. `node scripts/seed-template-catalog.js` (idempotent — does NOT touch ownership or PNGs).
   3. `node scripts/associate-template-owner.js <slug> <prod/staging companyId>`.
   4. **Do NOT** run `gen-template-thumbnails.js`.

   On staging this is wired behind the gated `workflow_dispatch` input `templates_visibility_setup` (safety dump → seed-catalog → associate-owner; never runs the generator).

---

## Why the manual PNG step is mandatory (the honest-placeholder rule)

A bespoke template with **no PNG** 404s, and the card/modal shows a neutral **"No preview yet"** placeholder — a calm, honest empty state. It **NEVER falls back to another template's image**: showing design B's picture for template A would misrepresent what the client's template looks like (same false-claim family as a lying "cannot be undone" copy).

So the placeholder keeps the UI honest, but it is **not** a finished template. Until preview-on-create is automated, **the PNG curation MUST be on the alta checklist** — or a new prod client ships with no preview. See `product/saas-ux-patterns.md` §10.
