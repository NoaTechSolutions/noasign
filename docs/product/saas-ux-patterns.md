# SaaS UX Patterns

Reusable interaction patterns for NoaSign. These are the house rules for how
common flows behave, so every feature feels like the same product. When you
build a new surface, reach for the pattern here before inventing one.

---

## §1 — Contextual edit is scoped to its section

An edit invoked from a section (the pencil on a card/tab) shows **only** that
section's fields — never the whole document. Model: the contract
`GroupEditPopup`. Already applied to invoices (`InvoiceEditPopup` is
section-scoped: Billed to / Service / Pricing) and receipts.

## §2 — Auto-format on input, everywhere the field is edited

A field's auto-format (titleCase for names, `capitalizeFirst` for `City, ST`
strings, phone masking, digits-only for zip) must apply in **both** creation and
edit. The transforms live in `wizard/types.ts` (`applyTransform`,
`applyDigitsOnly`, `applyLettersOnly`) — reuse them; don't re-implement per form.

## §3 — Destructive vs. reversible actions map to document state

What a document can do depends on its state. A DRAFT is not an issued document:
it is **deleted**, not voided. Void/Cancel are for already-issued docs (SENT).
Deletes are soft — the actor stops seeing the doc; a SUPERADMIN still sees it
flagged as deleted.

The full rule — which of the three kill-mechanisms (Delete / Cancel / Void) fires
for which type and state, and why each is stored differently — lives in
[../architecture/document-lifecycle.md](../architecture/document-lifecycle.md).
This §3 is the UX-behavior view; that doc is the canonical business rule.

## §4 — Send requires a deliverable channel

An action that emails the recipient (Send) must pre-flight its channel. No email
registered → a **non-destructive warning in place** (the popup stays open,
nothing is sent), never a silent failure or a raw backend error toast.

## §5 — Optimistic edit-save (close → saving → success refresh / error reopen)

**The pattern.** When the user hits **Save** in an edit popup:

1. **Close/lock the form immediately.** The user must not be able to keep
   touching inputs or buttons while the save is in flight.
2. **Show a "saving" indicator** in place of the form (a blocking card).
3. **On success → refresh in place.** The popup goes away; the underlying view
   reloads to show the saved values.
4. **On error → REOPEN the popup with the user's typed values + the error
   message**, so they can fix and retry without re-typing anything.

**Why.** Losing a user's input on a failed save is the cardinal sin of edit
forms. And letting them mash Save twice while a request is in flight causes
double-writes. This pattern closes both holes with one flow.

**How it's implemented (reuse this).** The shared shell `GroupEditPopup` owns
steps 1–2 via its `isSaving` prop: while `isSaving` is true it replaces the body
and footer with a blocking "Saving…" card and refuses to dismiss (overlay click,
Escape, and the X are all inert). The child popup drives the async flow:

```tsx
// in the child (e.g. InvoiceEditPopup / ReceiptEditPopup)
setSaving(true);
void onSave(payload)          // parent PATCHes, then closes + reloads on success
  .catch((e) => {
    setError(e.message);      // step 4: form reappears intact, with the error
    setSaving(false);
  });
```

The key move that makes **step 4 free**: the popup is *not unmounted* while
saving — the "closed" state is just the saving card drawn over the still-mounted
form. On success the **parent** unmounts it (e.g. `setInvoiceEditSection(null)`);
on failure `isSaving` flips back to `false` and the form — with every typed value
still in local state — reappears. There is nothing to re-hydrate.

**Applies to:** every edit popup built on `GroupEditPopup`. New edit surfaces get
this behavior for free by (a) rendering inside `GroupEditPopup`, (b) passing
`isSaving`, and (c) using the `setSaving(true) → onSave().catch(setError + setSaving(false))`
shape where the parent closes only on success.

**Extends to CREATE / SEND too.** The same shape governs the creation modal
(`DocumentCreationModal`): pressing Create draft / Create and send / Send covers
the whole form with a blocking "Saving…" card (nothing can be clicked/typed) and
makes the modal undismissable while in flight. Success closes it; failure lifts
the card and the form reappears with the user's values intact + the error. The
one exception is the optimistic **send** (email is fire-and-forget with a
top-right progress toast) — it closes immediately and the toast reports the real
SENT/SEND_FAILED outcome, since a failed *email* still produced a real document.
A failed **create** (draft) always reopens with values, never a silent toast-only
loss.

## §6 — Skeletons everywhere async content loads

**The rule.** Any title, value, link, or text that arrives asynchronously shows a
**skeleton placeholder** while it loads — never a bare pop-in and never a `—`
stand-in. The skeleton must occupy the **same space** as the final content so
swapping the real value in causes **no layout shift**.

**One primitive.** Use the shared `<Skeleton>` component
(`components/dashboard/shared/ui.tsx`) — it wraps the global `.skeleton-pulse`
shimmer (`globals.css`). Do **not** hand-roll `<span className="skeleton-pulse">`
spans inline, and do **not** invent per-component skeleton classes (the old
`welcome-skeleton-*` set was a divergent second implementation — removed).

```tsx
import { Skeleton } from '@/components/dashboard/shared/ui';

// size it to match the real content (no layout shift):
{isLoading ? <Skeleton width={32} height={24} /> : count}
```

Props: `width`, `height` (default 14), `radius`, `circle`, `className`, `style`.

**How loading is available.** Most dashboard panels receive `isLoading` from the
central `loadWorkspace` hook (`app/dashboard/page.tsx`) — thread it down and gate
each async value on it. Panels that self-fetch (Customers, Templates) own a local
`loading` state for the same purpose.

**Applies to:** every surface that renders server data. When you add a card,
stat, or field that loads, add its skeleton in the same commit.

## §7 — Dates display as US MM/DD/YYYY (4-digit year)

Every calendar date the user SEES renders as **MM/DD/YYYY** with a **4-digit
year** (e.g. `07/14/2026`), in **en-US regardless of the browser locale**. No
month-name form (`Jul 14, 2026`), no 2-digit year (`07/14/26`), no day-first
(`14/07/2026`).

**How.** Route every display through the canonical helper
`formatDisplayDate(value)` in `lib/format.ts`. It accepts an ISO date
(`yyyy-mm-dd`), a US date (returned as-is), or a full ISO timestamp, and always
emits `MM/DD/YYYY`. Never call `toLocaleDateString()`/`toLocaleString()` **without
an explicit `'en-US'` locale** — the no-arg form follows the browser and renders
day-first on a non-US machine. A bare ISO date must also be pinned to a **local**
calendar day (a UTC-parsed `new Date('yyyy-mm-dd')` shifts a day back in
negative-offset zones); `formatDisplayDate` already does this.

**Month/period labels are exempt.** Billing-month and "member since" labels stay
month-name (`Jul 2026`, `July 2026`) — they name a period, not a calendar date.

**Date+time** (admin timestamps) uses `toLocaleString('en-US', { … month:'2-digit',
day:'2-digit', year:'numeric', hour, minute })` — same MM/DD/YYYY ordering, plus
the time.

**Known gap — native pickers.** A native `<input type="date">` renders its OWN
text per the browser/OS locale and **cannot be forced** to MM/DD/YYYY. The stored
value is ISO and every read-only display is normalized, but the picker's editing
UI still follows the browser (e.g. day-first on an es-AR machine). Making the edit
inputs show MM/DD/YYYY requires a custom masked date component — tracked as a
dedicated follow-up (H2b), not yet done.

**Backend.** Receipt/invoice PDFs already print `MM/DD/YYYY`
(`formatInvoiceDate`/`formatFromParts` in `receipts.service.ts`).

## §8 — Validation is per-input: red border + inline message, never silent

Every form validation error is shown **on the specific input that failed**, not as
a single generic error at the top of the form, and a blocked save **never fails
silently**.

**The rule.**
1. The **input that fails** gets a red border (`form-input--error` / the module's
   `*--error` class — e.g. `wizard-field__input--error`, `gep-input--error`).
2. The message goes **inline, right below that input**, and is **specific to the
   field** ("Last name is required"), never a generic top banner ("First and last
   name are required").
3. A save/next is **blocked with a visible reason** — never a silent no-op, a bare
   flash, or a raw backend-error toast. If a required field is empty, the user must
   SEE which field and why.

**Applies to CREATE and EDIT, in every module.** The reference implementations are
the document **wizard** (`BaseField` → label + `*` + inline `wizard-field__error`)
and the **edit popups** (invoice/receipt/contract inline errors). The customers
form was aligned to this (`CustomerFormDrawer`: `fieldErrors` map + `form-input--error`
+ `form-field-error`, validated on both Next and Save so a cleared required field
can't reach the backend and fail silently).

**Standardization status.** The pattern is consistent (per-field error map + a
`*--error` border class + an inline message element) but there is **no single
shared field component** yet — the wizard uses `BaseField`, other forms wire the
classes directly. Extracting one shared `FormField`/`FieldError` primitive and
migrating every module onto it is a worthwhile dedicated refactor; until then, new
forms MUST follow the same three rules above using the existing classes.

## §9 — Animated row exit on delete (single source)

When a delete **removes a row from a table or card list**, the row **animates out**
before it disappears — it never vanishes abruptly on reload.

**The rule.**
1. The removed row/card **fades + slides left (~300ms)**, then the list reloads and
   drops it for real.
2. While it animates, the row is **not interactive** (`pointer-events: none`; its
   click handler is guarded).
3. It **honors `prefers-reduced-motion`** — the animation collapses to a near-instant
   fade for users who ask for reduced motion.
4. **Mobile parity**: the same exit plays on the mobile card list, not just the
   desktop table.

**Single source (not a per-module copy).** The timing + state live in the shared
hook `lib/use-row-exit.ts` (`useRowExit` → `{ removingId, animateRemoval }`); the
visual lives in the shared CSS class **`.row-exiting`** (`globals.css`, with the
`rowExitOut` keyframe + the reduced-motion override). A table/card just applies
`row-exiting` to the row whose id === `removingId`. `animateRemoval(id, afterExit)`
supports both flows: **delete-first** (customers: `await onDelete(id)` then
`animateRemoval(id, reload)`) and **delete-bundled** (documents:
`animateRemoval(id, () => onDelete(id))` where the delete already reloads).

**Applied to.** Customers (table + mobile cards) and Documents (draft delete: table +
mobile cards). **Not** Members — deactivating a member keeps the row (marked
inactive), so there is no removal to animate. Any future table whose delete removes
a row MUST reuse `useRowExit` + `.row-exiting`, never re-implement the animation.

## §10 — Template previews: honest placeholder + the curated-PNG alta step

Template preview thumbnails are **pre-generated PNGs committed to the repo** at
`apps/backend/assets/templates/previews/<slug>.png` (card) + `<slug>-full.png`
(modal), served by `GET /templates/previews/:file`. They are **owner-curated by
hand** — never run `gen-template-thumbnails.js` (it overwrites the curated PNGs).

**Two ways a tenant gets a template, two preview outcomes.**
- **(a) A catalog standard given in exclusivity** → privatize it IN PLACE
  (`associate-template-owner.js <slug> <companyId>`). The slug is unchanged, so its
  committed PNG still serves. This is the receipt pattern (`receipt-classic` → WPC)
  and now the invoice pattern (`invoice-standard-v1` → Laura). **Preview just works.**
- **(b) A bespoke per-tenant template** → a NEW slug with no PNG yet. This is the
  real prod case every time a client gets their own template.

**For (b) — the honest placeholder (never fake a preview).** A missing PNG 404s;
the card/modal `onError` shows a neutral **"No preview yet"** placeholder (icon +
text), styled as a calm normal state. It **NEVER falls back to another template's
image** — that would misrepresent what this template looks like (same false-claim
family as the "cannot be undone" copy or a lying "Saved!"). The backend keeps a
missing file as a plain 404 (expected, not logged), but logs an ERROR if a file
**exists yet fails to read** (permissions/corruption) — so the graceful UI never
masks a real broken asset.

**The alta checklist step (manual, until automated).** Creating a bespoke template
is NOT done until its preview PNG is curated:
- **Files:** `<slug>.png` (card) and `<slug>-full.png` (modal).
- **Format / size:** PNG, **1190×1683 px** (a Letter page; the card box crops via CSS).
- **Location:** `apps/backend/assets/templates/previews/` — committed to the repo, so
  it reaches every environment (local + staging + prod), the same way the catalog PNGs do.
- **Do NOT** run `gen-template-thumbnails.js`. The owner produces the PNG by hand.
Until this step is automated (generate-on-create), it MUST be in the alta checklist —
or a new prod client ships with no preview.
