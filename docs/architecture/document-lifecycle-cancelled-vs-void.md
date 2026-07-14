# Document lifecycle: CANCELLED vs VOID

Two different ways a document can be "killed". They are **not** interchangeable —
they live at different points of the lifecycle and are stored differently. This
note explains what each means, what triggers it, and where it applies, so the two
badges the owner sees on receipts don't read as a bug.

## CANCELLED — a real status, for a NOT-yet-issued document

- **Storage:** a first-class `DocumentStatus.CANCELLED` value + a `cancelledAt`
  timestamp. It has its own lifecycle rank and is counted separately in stats.
- **Trigger:** `DocumentsService.cancelDocument` (`documents.service.ts`). Allowed
  from `DRAFT`, `SENT`, `VIEWED` or `SEND_FAILED`.
- **Where it applies:**
  - **Contracts** — the natural "cancel this contract" lifecycle action.
  - **Receipts** — the kebab **"Discard"** on a receipt routes to `cancel`
    (`DocumentsPanel`: *"a receipt = cancel it"*).
- **Meaning:** the document is called off. For an unsent/draft receipt this is the
  right verb — nothing was issued, so there is nothing to legally annul.

## VOID — a derived state, for an ISSUED financial document

- **Storage:** **not** a status enum. VOID is **derived** from `supersededAt` being
  set; the document's internal `status` stays `SENT`. It reads as VOID everywhere
  (list, badge, card, timeline) and the stored PDF gets a full-page **VOID**
  watermark.
- **Trigger:**
  - Receipts — `voidReceipt` (2c, direct void, no replacement) or a **reissue**
    (`voidOriginalReceipt`, which also links original → correction). Only a **SENT**
    receipt can be voided.
  - Invoices — `voidInvoice` (`supersededAt` + clears any deferred schedule). The
    kebab **"Discard"** on an invoice routes to `void` (owner decision:
    *"an invoice = VOID it"*).
- **Meaning:** an already-issued fiscal document can't simply be deleted — the
  record must be preserved and visibly annulled. VOID keeps the accounting trail
  (and, on a reissue, the "Reissued to" link) intact.

## Why the owner sees BOTH on receipts

A **receipt** can end up in either terminal state depending on where it was killed:

| Receipt state when killed | Action | Result badge |
| ------------------------- | ------ | ------------ |
| DRAFT (never issued)      | Discard | **Cancelled** |
| SENT (issued)             | Void / Reissue | **Void** |

An **invoice** always ends up **Void** (Discard → void, even from draft — owner
decision to give invoices the same VOID treatment as receipts).

This is **semantically correct**: *not-issued → Cancelled*, *issued → Void*. It is
documented here rather than changed. If we later decide the two badges are
confusing for financial documents, the options on the table (not implemented) are:

1. **Unify to Void** for receipts/invoices — a discarded draft would also read Void,
   reserving Cancelled for contracts. Touches badges + stats (+ possibly the backend
   status).
2. **UI relabel only** — keep the internal status, show one consistent label/
   treatment in the receipts/invoices UI. Cosmetic, no backend change.

Decision (2026-07-14): **leave as-is, document only.**
