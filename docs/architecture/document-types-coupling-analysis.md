# Document types coupling analysis (contracts / invoices / receipts)

Reference for the decision on whether to separate services/controllers per document
type. Written after ~25 fixes across several sessions landed on the invoice/receipt
flows, to answer: **did that work affect CONTRACT documents, and how coupled are the
three types today?**

**Bottom line:** the contract *core* (BoldSign + the sign/complete lifecycle) was
**not touched**. What the invoice/receipt work shares with contracts is either
**display**, **additive**, or **type-gated**. Microservices would be overkill at this
scale; the right move is **logical separation inside the monolith + a contract
end-to-end guardrail test**.

Document families:

- **BOLDSIGN** — contracts (external signature lifecycle: send → viewed → signed →
  completed).
- **DIRECT_PDF** — receipts and invoices (financial docs, no signature; issued and
  emailed).

## (a) What the three types share today

### Backend

| Shared | What it is | Contracts use it |
| --- | --- | --- |
| `documents.service.ts` (~3,000 lines) | generic lifecycle: `createDraftDocument`, `getDocumentAccessScope` (every read), `sendDraftDocument`, `cancelDocument`, `deleteDocument`, `serializeDocument` | **Yes** — contracts (BoldSign) live here |
| `documents.controller.ts` | `/documents/*` routes (my-documents, :id, send, cancel, delete) | Yes |
| `DocumentStatus` enum + `Document` Prisma model | **one table** for all three types | Yes |
| `email.service.ts` | mail sending | Yes (but see below) |
| `boldsign.service.ts` (~645) · `receipt-pdf.service.ts` | **type-specific**: boldsign = contracts, receipt-pdf = receipts/invoices | Not cross-shared |
| `receipts.service.ts` (~1,978 🚩) | invoice **+** receipt logic mixed in one file | No (contracts don't) |

### Frontend

Shared components that render all three types (branch by `isInvoice` / `isReceipt`;
**contract = the default/else path**): `DocumentsPanel`, `DocumentDetailModal`,
`DocumentTableRow` / `DocumentCard` / `DocumentsTable` / `DocumentsToolbar` /
`DocumentsStats`, `StatusBadge` + `STATUS_META` (single source), `types.ts`
(`formatDate`, `isDeferredPending`, `getAvailableActions`), the schema-driven **wizard**
(`DocumentWizard`, `WizardSection`, `WizardBottomBar`, `useFormFields`, `TextField`),
and shared UI (`GroupEditPopup`, `ConfirmActionModal`, `ui.tsx`/`Skeleton`,
`lib/format`, `lib/tenant-date`).

## (b) Which fixes touched contract-shared code, and the real risk

| Change | Touches contracts? | Risk |
| --- | --- | --- |
| **Contract backend core** (`boldsign.service`; send/sign/cancel in `documents.service`) | **No — not one line.** The `documents.service` diff was only B7 + one additive field | — |
| **Status system** (`STATUS_META`, colour families + icon) | **Yes, visual.** Single source → recoloured contract DRAFT/SENT/VIEWED/SIGNED/COMPLETED/CANCELLED badges | Low (cosmetic, intentional). Visual-check a contract |
| **B7 soft-delete** (`getDocumentAccessScope` + `deleteDocument`) | **Yes.** Added `deletedAt: null` to every read + a DRAFT-gated delete | Low. Existing contracts have `deletedAt = null` → still matched; only intentionally-deleted docs are excluded |
| **Date format MM/DD/YYYY (H2a) + G2 TZ fix** | **Yes, display.** Contract date fields (start/completion/finance dates, contractDate) go through shared `formatDate`/`formatValue` | Low (display-only; also fixes a real UTC off-by-one) |
| **Wizard form-engine** (`WizardSection`, `useFormFields`, `TextField`) | **Yes.** Contracts are schema-driven wizards too | **Medium.** Shared form engine → smoke-test creating a contract |
| **`GroupEditPopup` / C3 optimistic save** | **Yes.** Contracts edit sections through it | Medium-low. Edit UX changed → check editing a contract |
| **Skeletons (C1) / `ui.tsx`** | Yes, additive | Low |
| `isDeferredPending` / Scheduled state | **No** — gated on `issueDate`, which contracts never set → always `false` | — |
| G1 / G4 / H1 / H3 / I1 (network msg, kebab prefill, send-now, Send/Schedule copy) | **No** — gated by `isInvoice` / `isReceipt` / `onCreateInvoice` / `scheduleLabel` | — |
| `WizardBottomBar` `isScheduling` (I1) | Shared, but `isScheduling` defaults `false` (contracts don't pass `scheduleLabel`) → no change | — |

## (c) What protects against contract regressions today

1. **Type gating** — `isInvoice` / `isReceipt` + `generationMode` (BOLDSIGN vs
   DIRECT_PDF) route the new logic; contracts fall through to the default path.
2. **`issueDate` gating** — the whole scheduled/deferred feature requires `issueDate`,
   which contracts don't set.
3. **Existing backend separation** — `boldsign.service` (contracts) was **not touched**;
   invoice/receipt logic lives apart in `receipts.service`.
4. **Unit tests** — `documents.service.spec.ts` covers the shared lifecycle contracts
   use (create / update / send / cancel / resend / reactivate / simulate signed +
   completed / `deleteDocument` B7).

### The real protection gap

- **Pre-existing red specs** — some `$transaction` mocks went stale after a counters
  refactor; a few `documents.service` / `receipts.service` specs are red on `develop`
  independently of this work.
- **No contract end-to-end test** — `test/` has nothing exercising the BoldSign
  create → send → sign → complete cycle. Today's safety net is type-gating + unit
  specs (with known reds), not an e2e guard.

## (d) Recommendation

**Microservices is overkill here.** No independent scaling/deploy need; it would add
network hops, distributed transactions, and ops complexity for a small team/product —
solving a problem we don't have and creating three we would.

But the underlying ask — "a change in one type shouldn't break another" — is valid, and
there's an intermediate separation worth doing, in ROI order:

1. **(Cheap, HIGH value) A contract safety net.** The real risk isn't the architecture,
   it's that ~25 fixes touched shared code with no test exercising a contract end to end.
   A smoke/e2e of the contract cycle (create → send → sign → complete) catches any
   shared-code regression. **Do this first.**
2. **(Medium) Split `receipts.service.ts` (~1,978 lines, invoice + receipt mixed) into
   `invoices.service` + `receipts.service`** inside the **same monolith** — they already
   have separate controllers. This is where "an invoice change can break a receipt" is
   real, because they share one large file.
3. **(Optional, frontend) Continue the per-type tab pattern** (`InvoiceSectionTab`
   already exists) → extract `ContractSectionTab` / `ReceiptSectionTab` so
   `DocumentDetailModal` (which took +432 lines) stops being a god component.

**In one line:** logical separation **inside the monolith** (per-type services + a
contract guardrail test), **not** microservices — ~90% of the isolation at ~10% of the
cost, with zero ops debt.

## Related product decision

Document *types* are organized as **one "Documents" module with tabs/filter by type**,
not a module per type — because types will grow (quote/estimate, credit note, statement,
PO…) but *families* won't (DIRECT_PDF financial vs BOLDSIGN signature). Adding a type =
one more filter option, zero new modules. See engram `product/documents-module-tabs-by-type`.
