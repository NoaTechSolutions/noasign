# Tenancy — how object references are authorized (and the gap found on 2026-07-21)

Every tenant-owned row in this system is scoped by `companyProfileId`. This note
records **the rule**, **where it is enforced**, and **the one class of gap that a
2026-07-21 audit found** — so the same mistake is recognisable next time.

_Verified against `apps/backend/src` — 2026-07-21. Audit covered all 18
controllers._

---

## The rule

> Resolve the caller's tenant **server-side from the JWT**, then constrain **every
> by-id lookup** with the id **and** the tenant.

```ts
// The caller's tenant is never taken from the request body or a query param.
const user = await this.prisma.user.findUnique({ where: { id: userId } });
// ...
where: { id: documentId, companyProfileId: user.companyProfileId }
```

`JwtStrategy.validate` re-reads the user from the database on every request and
returns `role`/`companyProfileId` from that row, **not** from the token payload
(`auth/strategies/jwt.strategy.ts:29-52`). That is what makes `req.user` a
trustworthy basis for the whole model.

Two shared helpers implement the rule for the two big families, and they should
be reused rather than re-derived:

| Helper | Where | What it adds beyond the tenant |
|---|---|---|
| `getDocumentAccessScope(userId)` | `documents.service.ts:410-435` | SUPERADMIN sees the whole tenant; normal users are filtered to their own rows; non-superadmins also get `deletedAt: null` |
| `loadReceiptForUser(userId, id)` | `receipts.service.ts:1359-1379` | tenant **and** `documentType.code = PAYMENT_RECEIPT` |

---

## The gap class: the *route object* is checked, the *referenced object* is not

The audit found the discipline is applied consistently to the object named in the
**URL**. Where it slipped was on objects referenced **inside the payload**.

> ### ⚠️ Checking the document does NOT check what the document points at
>
> `loadReceiptForUser` proves *this receipt is mine*. It says nothing about the
> `customerId` in the request body. Those are **two different object references**
> and each needs its own authorization. This is the mistake to look for.

### What was found

**1. `customerId` — a real cross-tenant read (fixed 2026-07-21).**
Four sale-document write paths wrote the FK unvalidated — `createReceipt`,
`createInvoice`, `updateReceipt`, `updateInvoice` — while the contract path at
`documents.service.ts:991-1000` had always verified it. The read-back chain had
two exits:

- `documentDetailInclude` joins `customer: true` (`documents.service.ts:86`), so
  `GET /documents/:id` returned the whole foreign `Customer` row.
- the receipt-stats "top clients" query resolved names by id with **no** tenant
  filter, surfacing a foreign customer's name on the dashboard.

Fixed by `assertCustomerInTenant` (`receipts.service.ts`, called from all four
paths) plus a `companyProfileId` filter on the stats lookup. Pinned by
`test/e2e/customer-tenancy.e2e-spec.ts`.

**2. `signatureTemplateId` — the same shape, latent (hardened 2026-07-21).**
`createDraftDocument` resolved it with a bare
`findUnique({ where: { id } })`. `SignatureTemplate.companyProfileId` carries
real ownership semantics (`schema.prisma:471-475`): **`null` = the global catalog
every tenant may use; a set value = a template privately owned by that tenant.**
A bare `findUnique` cannot express that rule, so another tenant's private
template resolved fine, exposing its `providerTemplateId`, field mappings and
send subject/message templates through the rendered document. Now scoped to
`companyProfileId: null OR the caller's`. Pinned by
`test/e2e/signature-template-tenancy.e2e-spec.ts`.

> ### ⚠️ `findUnique({ where: { id } })` is the smell
>
> Prisma's `findUnique` accepts only a unique key, so it **cannot** express a
> compound `{ id, companyProfileId }` constraint. Any `findUnique` by bare id in a
> request path is either (a) a global catalog row, (b) followed by an explicit
> ownership check, or (c) **a bug**. Prefer `findFirst` with both fields.

---

## Deliberately cross-tenant — do not "fix" these

Several places are cross-tenant **on purpose**. They are gated on `SUPERADMIN`,
and the audit flagged them only because that gate is broader than it reads:

- `getDocumentTypes(?asUserId)` — master views another tenant's provisioning
  (`documents.service.ts:670-677`, documented as intentional)
- `selectable-users` — returns users across tenants for the master picker
- the receipt-template "borrow" (`receipts.service.ts:177-180`)
- the `AccountRequest` queue, which has no tenancy column at all

> **`SUPERADMIN` alone means "a master of *some* tenant", not "the platform
> owner".** The `admin` module requires strictly more: `assertSuperadmin`
> (`admin.service.ts:30-44`) also demands `parentCompanyProfileId === null` — the
> **root** master. When a feature should be platform-wide, use the root check;
> `role === 'SUPERADMIN'` on its own lets any tenant's master through.

## What is NOT a tenancy hole

`streamInvoicePdf` was reported as a possible cross-tenant leak on 2026-07-21 and
**was not one** — `companyProfileId` was already in its where-clause. Its real
defect was a missing `documentType` filter, so a *receipt* id from the caller's
*own* tenant rendered a blank PDF instead of 404. Type confusion, not tenant
confusion. The distinction matters: the cross-tenant e2e case for that route is
green both before and after the fix, and is kept as a regression pin.

## Auditing existing data

The write guards stop new dirty rows; they say nothing about rows written
earlier. `scripts/audit-customer-tenancy.js` is **read-only** and reports any
Document whose `customerId` belongs to another tenant. Local was clean (36
documents carrying a customer, 0 cross-tenant) on 2026-07-21; staging and
production still need a run.

## Related

- [document-lifecycle.md](document-lifecycle.md) — the three "kill" mechanisms
- [../development/testing.md](../development/testing.md) — what the e2e layer does and does not cover
