# Document lifecycle: Delete vs Cancel vs Void

There are **three** different ways a document can be "killed". They are **not**
interchangeable — they live at different points of the lifecycle, apply to
different document types, and are **stored differently on purpose** (see
[Why three mechanisms](#why-three-mechanisms-and-not-one)). This note explains
what each means, what triggers it, and where it applies, so the different badges
the owner sees don't read as a bug.

> **This model formalizes what the code already did.** The soft-delete behavior
> (B7) was in the code **before** the owner decided this model on 2026-07-17 —
> the code had already arrived at the right answer on its own, and the model
> **confirms** it rather than imposing a new rule. (An earlier note,
> `document-lifecycle-cancelled-vs-void.md` dated 2026-07-14, predated B7 and
> mis-described "Discard" as routing to Cancel/Void; this document supersedes and
> corrects it — verified against the code below.)

| Mechanism | Field | Triggered from | Types | UI action | Reversible by |
|---|---|---|---|---|---|
| **DELETE** | `deletedAt` (soft) | DRAFT or SEND_FAILED | **any** | "Delete" (drafts) · "Discard" (SEND_FAILED sale docs) | **SUPERADMIN only** (`restoreDocument`) |
| **CANCEL** | `status = CANCELLED` + `cancelledAt` | SENT / VIEWED | **contracts only** | "Cancel" (= void the BoldSign signature request) | the owner (`reactivateDocument`) |
| **VOID** | `supersededAt` (status stays SENT) | SENT | **receipts / invoices only** | "Void" (direct) · "Reissue" (void original + corrected copy) | **nobody — terminal** |

---

## DELETE — soft-delete of a not-yet-issued (or failed) document

- **Storage:** a nullable `deletedAt` timestamp (`schema.prisma:712`). Soft — the
  row is never removed.
- **Trigger:** `DocumentsService.deleteDocument` (`documents.service.ts:1562-1586`,
  sets `deletedAt` at 1584). Allowed **only from DRAFT or SEND_FAILED** — the guard
  at 1573-1580 throws *"Only draft or send-failed documents can be deleted"* for
  anything else. Works on **any** document type (no type filter).
- **UI:** two labels, **one endpoint** (`DELETE /documents/:id`). "Delete" on
  drafts (all types) and SEND_FAILED contracts; "Discard" on SEND_FAILED
  receipts/invoices (`DocumentsPanel.tsx:531` for delete, `628` for
  discard — *"Discard maps to DELETE (soft) for receipts AND invoices"*).
- **Who still sees it:** `getDocumentAccessScope` (`documents.service.ts:410-435`).
  A normal user's scope filters `deletedAt: null` (434) — they never resolve a
  deleted doc again. A **SUPERADMIN** has no `deletedAt` filter (433), so they
  still see it, rendered view-only with a "Deleted" badge (derived by
  `isDeletedDoc`, `types.ts:297-299`; actions reduced to `['view','restore']` at
  `types.ts:329`; badge rendered in `DocumentTableRow.tsx:106-107` and
  `DocumentCard.tsx:109-110`).
- **Reversible — SUPERADMIN only:** `restoreDocument`
  (`documents.service.ts:1592`, `POST /documents/:id/restore`) clears `deletedAt`
  so the doc reappears **in its prior status**. Hard role gate — a non-superadmin
  gets *"Only a superadmin can restore a deleted document"*. The owner can never
  restore, because the owner can never even see a deleted doc.
- **Meaning:** a draft or send-failed document was **never issued** — there is
  nothing to legally annul, so it is simply removed from view.

## CANCEL — a real status, for a signature contract

- **Storage:** a first-class `DocumentStatus.CANCELLED` value + a `cancelledAt`
  timestamp (`schema.prisma:43-51`, `708`). It has its own lifecycle rank and is
  counted separately in stats.
- **Trigger:** `DocumentsService.cancelDocument` (`documents.service.ts:1524-1556`,
  sets `CANCELLED` + `cancelledAt` at 1546-1547). The backend guard allows
  DRAFT/SENT/VIEWED/SEND_FAILED, **but the UI only ever fires it for SENT/VIEWED
  contracts** (`types.ts:393-395` — *"Cancel (= void the BoldSign signature)"*).
- **Types:** **contracts only.** Receipts and invoices **never** reach `CANCELLED`
  — the code is explicit: *"Sale docs use 'discard' for this; contracts [use
  cancel]"* (`types.ts:402-403`).
- **A DRAFT contract is DELETED, not cancelled** (owner rule, 2026-07-20). Cancel
  is reserved for what the client **already received**. The UI routes a DRAFT or
  SEND_FAILED contract to `delete` (`types.ts:393-395`, `402-403`), the same as
  drafts of every other type.
- **Reversible by the owner:** `reactivateDocument` (`documents.service.ts:1631`)
  requires `status === CANCELLED` and resets the doc to `DRAFT`, nulling
  `cancelledAt, sentAt, viewedAt, signedAt, completedAt` and the signature-provider
  fields, then writing a new `DocumentVersion`. **Not** superadmin-gated — scope
  only. So it is not "un-cancel": it is *start again with the same content*.
- **Meaning:** a sent contract's signature request is called off at the provider.

## VOID — a derived state, for an issued financial document

- **Storage:** **not** a status enum value. VOID is **derived** from `supersededAt`
  being set (`schema.prisma:739`); the document's internal `status` stays `SENT`.
  It reads as VOID everywhere (list, badge, card, timeline via `isVoidedDoc`,
  `types.ts:288-293`) and the stored PDF gets a full-page **VOID** watermark.
- **Trigger:** only a **SENT** receipt/invoice, via two actions:
  - **Void** (direct, no replacement) — `voidReceipt`
    (`receipts.service.ts:1753-1766`, requires SENT) / `voidInvoice`
    (`1094-1127`, requires SENT, sets `supersededAt` at 1119).
  - **Reissue** — `voidOriginalReceipt` (`1699-1713`, sets `supersededAt` at 1708)
    voids the original **and** links original → correction.
  - Both surface only on a non-superseded SENT receipt:
    `actions.push('resend', 'reissue', 'void')` (`types.ts:348`). A voided doc is
    terminal (`types.ts:347`).
- **Types:** **receipts / invoices only.**
- **Irreversible.** There is no un-void: no production code anywhere writes
  `supersededAt: null` (the only occurrences are test fixtures), and no endpoint
  exposes it. Voiding twice is rejected. This is the one mechanism of the three
  that cannot be walked back.
- **Meaning:** an already-issued fiscal document can't just be deleted — the record
  must be **preserved and visibly annulled**. VOID keeps the accounting trail (and,
  on a reissue, the "Reissued to" link) intact.

---

## Why three mechanisms and not one

Read this before "fixing" the asymmetry — it is deliberate. The three are stored
differently because they are **three different concepts**, and forcing them into
one mechanism would be worse, not cleaner:

- **CANCEL is a state in the lifecycle** → so it is a first-class **enum value**
  (`CANCELLED`). You *transition to* it, the same way you transition to `SENT` or
  `COMPLETED`. A state belongs in the status enum.

- **VOID is a relationship of replacement, not a state** → so it is **derived from
  `supersededAt`**, not stored as a status. A receipt is void *because* another
  document supersedes it. If VOID were its own enum value, you would have **two
  sources of truth** — the `status` field **and** the supersession link — that
  could drift out of sync. That is the exact class of bug this codebase fights
  (two timelines, two save paths, two seeds). Deriving VOID from the one link
  keeps a **single source of truth**.

- **DELETE is a visibility flag, orthogonal to the lifecycle** → so it is a
  nullable **`deletedAt`**, not a status. It answers "should the actor still see
  this?", not "what stage is this at?". A status value would wrongly couple
  visibility to lifecycle position.

## Status lifecycle

The `DocumentStatus` enum has **exactly** these seven values (`schema.prisma:43-51`):

`DRAFT` · `SENT` · `SEND_FAILED` · `VIEWED` · `SIGNED` · `COMPLETED` · `CANCELLED`

`VIEWED`, `SIGNED` and `COMPLETED` are **contract-only** in practice — they are driven
by BoldSign webhooks, and receipts/invoices (DIRECT_PDF) never reach the provider. The
sale-document surface uses only `DRAFT`, `SENT` and `SEND_FAILED`.

Three display states are **derived, not stored**: **Deleted** (`deletedAt`), **Void**
(`supersededAt`) and **Scheduled** (`DRAFT` + a future `issueDate`). None of them is an
enum value, and none of them should become one.

> ### ⚠️ You will NOT find `VOID` in the `DocumentStatus` enum — that is deliberate
>
> The enum is `DRAFT, SENT, SEND_FAILED, VIEWED, SIGNED, COMPLETED, CANCELLED`
> (`schema.prisma:43-51`). **VOID is intentionally absent** — it is derived from
> `supersededAt` so there is one source of truth. Do **not** add a `VOID` status;
> that would re-introduce the drift the derivation avoids.
>
> **The one rule that makes the derivation safe:** always compute the display
> state through the serializer / `isVoidedDoc`, **never read raw `status`** — a
> voided document's `status` still says `SENT`, and a UI that reads it directly
> will show "Sent" for a voided receipt.

> **These invariants are pinned by a test.** The exact enum values and the deliberate
> absence of `VOID` are asserted by `apps/backend/src/documents/lifecycle-invariants.spec.ts`
> (a fast unit test — no DB). If the code drifts from this doc, that test turns **red**
> with a message pointing back here — so this doc can't silently start lying the way the
> 2026-07-14 note did. When you intentionally change the lifecycle, update the doc **and**
> the test together.

> ### ⚠️ What the test does NOT pin
>
> The spec asserts **exactly two** things: the enum's value set, and that `VOID` is not
> in it. It does **not** cover any gating condition, any role rule, `deletedAt`,
> `supersededAt`, or which action each document type gets. **Every other rule in this
> document can drift without a single test turning red** — which is precisely how the
> `schema.prisma` line numbers here silently went stale before 2026-07-21.

> ### ⚠️ The backend is wider than the UI — these are UI conventions, not backend invariants
>
> `cancelDocument` (`documents.service.ts:1524-1556`) has **no `documentType` filter**, so
> `POST /documents/:id/cancel` will set `status = CANCELLED` on a **receipt or invoice** —
> which the "Types: contracts only" rule above declares impossible. Nothing but the absence
> of a UI button prevents it, and nothing pins it. `reactivateDocument` has the same shape.
> Read "contracts only" as *"no UI path does this today"*, not as a guarantee.

---

## Why the owner sees different badges

Which terminal state a document lands in depends on **where** and **on what type**
it was killed:

| Document state when killed | Type | Action | Result badge |
|---|---|---|---|
| DRAFT (never issued) | any | Delete | **Deleted** (hidden; SUPERADMIN sees it flagged) |
| SEND_FAILED | receipt / invoice | Discard | **Deleted** |
| SENT / VIEWED | contract | Cancel | **Cancelled** |
| SENT (issued) | receipt / invoice | Void / Reissue | **Void** |

This is **semantically correct**: *not-issued → Deleted*, *issued contract →
Cancelled*, *issued financial doc → Void*. `CANCELLED` belongs exclusively to
signature contracts; a receipt or invoice never reads "Cancelled".

**Decision (2026-07-17):** formalize the three-mechanism model as above,
confirming the soft-delete behavior the code (B7) already implemented. If the
distinct badges ever prove confusing for financial documents, the options on the
table (not implemented) are a UI relabel (cosmetic, no backend change) or unifying
receipts/invoices to a single terminal treatment — both would be a deliberate,
separate change, not a bug fix.

**Decision (2026-07-20):** a **DRAFT contract is deleted, not cancelled**, aligning
contracts with receipts/invoices. `CANCELLED` now means exclusively "the client had
already received it". Shipped to production in `22babb5` together with F1 restore
(SUPERADMIN-only).

---

_Verified against `apps/backend/src/documents/documents.service.ts`,
`apps/backend/prisma/schema.prisma`, `apps/frontend/components/dashboard/panels/v2/documents/`
— 2026-07-21. This pass corrected every `schema.prisma` citation (they had drifted
~48 lines: `cancelledAt` 660→708, `deletedAt` 664→712, `supersededAt` 691→739),
corrected the `types.ts` / `DocumentsPanel.tsx` citations, and added the two
reversibility mechanisms (`restoreDocument`, `reactivateDocument`) that the document
previously omitted entirely._
