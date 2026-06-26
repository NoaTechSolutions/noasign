# Receipt Billing — Model C (receipt quotas + RECEIPTS_ONLY plan + overage)

> Status: **implementing in LOCAL** (not on staging/prod). Owner-approved design, 2026-06-25.
> Scope: real solution for receipt billing. worldpaversco is NOT blocked (it is on PRO_UNLIMITED),
> so this is built cleanly — it is not the quick-unblock patch.

## 1. Problem / background

Today receipts are invisible to billing and there is **no receipt quota anywhere**:

- `receipts.service.ts` creates every receipt with `countedInBilling: false` (hardcoded) and never
  flips it — not on SEND, not on resend. Receipts never count toward anything.
- The backend has **zero** plan/quota/feature gate on receipt creation (`createReceipt`,
  `getDocumentTypes`).
- `/billing/current-usage` returns a single `remaining` / `monthlyDocLimit` / `planName` computed
  from **contract** documents only (`countedInBilling: true`, no doc-type filter). The frontend
  surfaces that one number on the plan card, the billing panel and overage warnings as if it
  governed everything — including receipts. That conflation is the "plan restriction" worldpaversco
  perceived on a receipt. **There is no hard frontend block on receipt creation** — the v2 receipt
  flow (`onCreateReceipt`) posts freely; `canStartNewDraft`/`startNewDraft` are contract (triple)
  flows keyed on role, and `isUnlimited`/`remaining` are display-only.

The fix is a **separate receipt-usage dimension** (quota, overage, unlimited) that is independent
from the contract limit, plus a new receipts-only plan.

## 2. Pricing (decided)

| Plan | Contracts | Receipts/mo | Receipt overage | Monthly price |
|------|-----------|-------------|-----------------|---------------|
| `RECEIPTS_ONLY` ("Recibos") | ✗ (`contractsEnabled=false`) | ∞ | — | $19 |
| `STARTER` | per `monthlyDocLimit` | 20 | $0.25 | (contract pricing) |
| `LAUNCH` | per `monthlyDocLimit` | 35 | $0.25 | (contract pricing) |
| `PRO` | ∞ | ∞ | — | (contract pricing) |
| `SCALE` | ∞ | ∞ | — | (contract pricing) |
| `PAY_PER_CONTRACT` | pay-as-you-go | 0 | $0.25 | (pay-as-you-go) |

Existing tenants on `LAUNCH` / `SCALE` / `PRO_UNLIMITED` are **NOT remapped** — those enum values
stay. Cleanup of legacy names is parked for the role/plan refactor.

## 3. Decisions (A–D)

- **A — Enum is ADDITIVE.** Add `STARTER`, `PRO`, `PAY_PER_CONTRACT`, `RECEIPTS_ONLY`. Do not remap
  `LAUNCH` / `SCALE` / `PRO_UNLIMITED`. Receipt quotas live in **per-tenant fields** (preserves
  manual overrides like worldpaversco), seeded from a `PLAN_DEFAULTS` map only when a plan is
  assigned.
- **B — Count a receipt on SEND** (first successful send), not on DRAFT. Mirrors contracts counting
  on engagement, and a never-sent draft consumes nothing.
- **C — Reissue/void does NOT consume new quota.** A reissue corrects an existing receipt; it is not
  a new billable unit. Guard: a receipt with `supersedesId != null` is never counted.
- **D — `PAY_PER_CONTRACT` = `monthlyReceiptLimit: 0` + overage `$0.25`** (pure pay-as-you-go, no
  special-case code — it is just a limit of 0 with overage enabled).

## 4. Schema (additive migration, drift-safe)

`enum PlanName` gains `STARTER`, `PRO`, `PAY_PER_CONTRACT`, `RECEIPTS_ONLY` (existing values kept).

`CompanyProfile` gains per-tenant receipt-billing fields:

```prisma
monthlyReceiptLimit Int     @default(0)      // STARTER 20, LAUNCH 35; ignored if receiptsUnlimited
receiptsUnlimited   Boolean @default(false)  // PRO, SCALE, RECEIPTS_ONLY
receiptOveragePrice Decimal @default(0.25) @db.Decimal(10, 2)
contractsEnabled    Boolean @default(true)   // false on RECEIPTS_ONLY
```

`Document` gains a receipt-billing dimension, **separate** from the contract `countedInBilling` so
the two quotas never cross-contaminate (the existing `billingPeriod` field is reused):

```prisma
countedAsReceipt Boolean @default(false)
isReceiptOverage Boolean @default(false)
```

Migration is applied with the **drift-safe** flow (NEVER `migrate dev`):
`prisma db execute --file migration.sql` then `prisma migrate resolve --applied <name>`.
Postgres note: `ALTER TYPE ... ADD VALUE` runs as its own statement (a freshly added enum value
cannot be used in the same transaction as its `ADD VALUE`).

## 5. PLAN_DEFAULTS

A single source of truth (`apps/backend/src/billing/plan-defaults.ts`) mapping each `PlanName` to the
fields written to `CompanyProfile` **when a plan is assigned**. Enforcement reads the per-tenant
fields, NOT this map — so manual overrides survive.

| Plan | monthlyReceiptLimit | receiptsUnlimited | receiptOveragePrice | contractsEnabled |
|------|---------------------|-------------------|---------------------|------------------|
| RECEIPTS_ONLY | 0 | true | 0.25 | false |
| STARTER | 20 | false | 0.25 | true |
| LAUNCH | 35 | false | 0.25 | true |
| PRO | 0 | true | 0.25 | true |
| SCALE | 0 | true | 0.25 | true |
| PAY_PER_CONTRACT | 0 | false | 0.25 | true |
| (legacy) PRO_UNLIMITED | 0 | true | 0.25 | true |

## 6. Enforcement (backend)

- **Where:** in `receipts.service.ts`, at the first successful flip to `SENT` (and on a successful
  retry of a `SEND_FAILED` receipt).
- **Guarded by:** `!document.countedAsReceipt` (no double count on resend) AND `supersedesId == null`
  (decision C).
- **State helper:** `getReceiptBillingState(companyProfile)` → `{ billingPeriod, isReceiptOverage }`.
  Counts existing `countedAsReceipt: true` receipts for the tenant in the current period. If
  `receiptsUnlimited || isMaster` → never overage. Else `isReceiptOverage = used >= monthlyReceiptLimit`.
- **On count:** set `countedAsReceipt: true`, `billingPeriod`, `isReceiptOverage`. Overage receipts
  are still created/sent (Starter/Launch/PPC have overage — it is billed at `receiptOveragePrice`,
  not blocked).
- **Superadmin borrow:** the receipt document belongs to the **creator** (creator's `userId` +
  `companyProfileId`); the quota check uses the **creator's** profile. Masters are `isUnlimited`, so a
  master borrowing a tenant's template never burns that tenant's quota. ✅
- **RECEIPTS_ONLY contract gate:** `getDocumentTypes` excludes BOLDSIGN types when the tenant's
  `contractsEnabled === false`; contract creation is rejected server-side for those tenants.

## 7. Frontend

- Extend `/billing/current-usage` with `receiptsUsed`, `monthlyReceiptLimit`, `remainingReceipts`,
  `receiptsUnlimited`, `receiptOveragePrice`.
- The receipt flow reflects the **receipt** quota (not the contract one): `ReceiptForm` shows
  remaining receipts + an overage hint ("X receipts left · then $0.25 each").
- The contract flow keeps using the contract remaining (unchanged).
- `RECEIPTS_ONLY` tenants: hide/disable contract creation entirely.

## 8. Implementation order

1. Pin the erroneous gate (done — it is usage-model conflation, no hard block to remove).
2. Schema migration (additive, drift-safe).
3. Backend enforcement (count on SEND + overage) ∥ 4. `getCurrentUsage` receipt fields + `PLAN_DEFAULTS`.
5. Frontend usage shape + receipt gate + overage UI + RECEIPTS_ONLY contract hiding.
6. `prod-maintenance` set-tenant-plan supports the new plans + receipt fields.

Stop before staging; report per task with tests/build green.
