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
