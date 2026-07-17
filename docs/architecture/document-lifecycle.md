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

| Mechanism | Field | Triggered from | Types | UI action |
|---|---|---|---|---|
| **DELETE** | `deletedAt` (soft) | DRAFT or SEND_FAILED | **any** | "Delete" (drafts) · "Discard" (SEND_FAILED sale docs) |
| **CANCEL** | `status = CANCELLED` + `cancelledAt` | SENT / VIEWED | **contracts only** | "Cancel" (= void the BoldSign signature request) |
| **VOID** | `supersededAt` (status stays SENT) | SENT | **receipts / invoices only** | "Void" (direct) · "Reissue" (void original + corrected copy) |

---

## DELETE — soft-delete of a not-yet-issued (or failed) document

- **Storage:** a nullable `deletedAt` timestamp (`schema.prisma:664`). Soft — the
  row is never removed.
- **Trigger:** `DocumentsService.deleteDocument` (`documents.service.ts:1562-1586`,
  sets `deletedAt` at 1584). Allowed **only from DRAFT or SEND_FAILED** — the guard
  at 1573-1580 throws *"Only draft or send-failed documents can be deleted"* for
  anything else. Works on **any** document type (no type filter).
- **UI:** two labels, **one endpoint** (`DELETE /documents/:id`). "Delete" on
  drafts (all types) and SEND_FAILED contracts; "Discard" on SEND_FAILED
  receipts/invoices (`DocumentsPanel.tsx:522-526` for delete, `609-617` for
  discard — *"Discard maps to DELETE (soft) for receipts AND invoices"*).
- **Who still sees it:** `getDocumentAccessScope` (`documents.service.ts:410-435`).
  A normal user's scope filters `deletedAt: null` (434) — they never resolve a
  deleted doc again. A **SUPERADMIN** has no `deletedAt` filter (433), so they
  still see it, rendered view-only with a "Deleted" badge (`types.ts:295-297`,
  `326`).
- **Meaning:** a draft or send-failed document was **never issued** — there is
  nothing to legally annul, so it is simply removed from view.

## CANCEL — a real status, for a signature contract

- **Storage:** a first-class `DocumentStatus.CANCELLED` value + a `cancelledAt`
  timestamp (`schema.prisma:43-51`, `660`). It has its own lifecycle rank and is
  counted separately in stats.
- **Trigger:** `DocumentsService.cancelDocument` (`documents.service.ts:1524-1556`,
  sets `CANCELLED` + `cancelledAt` at 1546-1547). The backend guard allows
  DRAFT/SENT/VIEWED/SEND_FAILED, **but the UI only ever fires it for SENT/VIEWED
  contracts** (`types.ts:391` — *"Cancel (= void the BoldSign signature)"*).
- **Types:** **contracts only.** Receipts and invoices **never** reach `CANCELLED`
  — the code is explicit: *"Sale docs use 'discard' for this; contracts [use
  cancel]"* (`types.ts:399`).
- **Meaning:** a sent contract's signature request is called off at the provider.

## VOID — a derived state, for an issued financial document

- **Storage:** **not** a status enum value. VOID is **derived** from `supersededAt`
  being set (`schema.prisma:691`); the document's internal `status` stays `SENT`.
  It reads as VOID everywhere (list, badge, card, timeline via `isVoidedDoc`,
  `types.ts:286-291`) and the stored PDF gets a full-page **VOID** watermark.
- **Trigger:** only a **SENT** receipt/invoice, via two actions:
  - **Void** (direct, no replacement) — `voidReceipt`
    (`receipts.service.ts:1753-1766`, requires SENT) / `voidInvoice`
    (`1094-1127`, requires SENT, sets `supersededAt` at 1119).
  - **Reissue** — `voidOriginalReceipt` (`1699-1713`, sets `supersededAt` at 1708)
    voids the original **and** links original → correction.
  - Both surface only on a non-superseded SENT receipt:
    `actions.push('resend', 'reissue', 'void')` (`types.ts:345`). A voided doc is
    terminal (`types.ts:344`).
- **Types:** **receipts / invoices only.**
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
