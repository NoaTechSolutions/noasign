# NTSsign — Architecture Overview

_Last verified against code: 2026-07-17_

## System Purpose

NTSsign is a multi-tenant SaaS platform that manages the full lifecycle of business documents. It handles two distinct document families:

- **Signed contracts** — orchestrated through an external e-signature provider (BoldSign). NTSsign holds the document data, drives the workflow, and delegates the actual signing.
- **Financial documents (receipts + invoices)** — generated in-house as PDFs (DIRECT_PDF), stored, and emailed. No external signature provider is involved.

Designed to be consumed both by end users through the web UI, and by **external SaaS platforms** via API.

---

## Current Architecture

```
                          ┌─────────────────────────────────────────┐
                          │           Cloudflare (DNS + SSL)         │
                          └──────────────┬──────────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
   ntssign.com                app.ntssign.com              api.ntssign.com
              │                          │                          │
              ▼                          ▼                          ▼
   ┌─────────────────┐    ┌─────────────────────────────────────────────┐
   │   Cloudflare     │    │              Oracle Cloud VM                │
   │  (landing page)  │    │                                             │
   │                   │    │  ┌─────────────┐    ┌──────────────────┐  │
   │  index.html       │    │  │    nginx     │────│  NTSsign Backend │  │
   │  + img/           │    │  │  (reverse    │    │  NestJS 11 / pm2 │  │
   │  static files     │    │  │   proxy)     │    │  Port 3000       │  │
   └─────────────────┘    │  └─────────────┘    └────────┬─────────┘  │
                           │         │                    │             │
                           │  ┌─────────────┐    ┌───────▼──────────┐  │
                           │  │  NTSsign    │    │  PostgreSQL 16    │  │
                           │  │  Frontend   │    │  (single instance)│  │
                           │  │  Next.js 16 │    └──────────────────┘  │
                           │  │  pm2 / :3001│                           │
                           │  └─────────────┘                           │
                           └────────────────────────────────────────────┘
```

**External services** (called from the backend, no inbound access to the VM):

| Service | Purpose | Inbound webhook |
|---|---|---|
| **BoldSign** | E-signature provider for contracts | `POST /boldsign/webhooks/events` (HMAC-verified) |
| **Cloudflare R2** | Object storage for generated PDFs (receipts, invoices, signed contracts) | — |
| **Resend** | Transactional email (signing invites, receipt/invoice PDFs, etc.) | `POST /webhooks/resend` (Svix-verified → `SEND_FAILED`) |
| **Sentry** | Error observability (front + back), PII-scrubbed | — |

**DNS routing summary:**

```
Internet
  ↓
Cloudflare DNS
  ├── ntssign.com     → a SEPARATE Next.js landing (NOT in this repo), behind Cloudflare
  ├── app.ntssign.com → Oracle Cloud VM (Next.js :3001)
  └── api.ntssign.com → Oracle Cloud VM (NestJS :3000)
```

> ✅ **The `ntssign.com` landing IS in this repo** (corrected 2026-07-19).
> Source: `apps/frontend/app/(marketing)/` (`page.tsx` + `terms/`, `privacy/`, `pricing/`,
> `cookies/`). Build/deploy: `scripts/export-landing.sh` produces a Next.js **static export**
> that is FTP'd to **SiteGround** (Apache, behind Cloudflare) by
> `.github/workflows/deploy-landing.yml` — prod on push to `main`, staging on push to `develop`.
> The live-site markers confirm it: `/_next/static/*` chunks + `charSet` = a Next static export,
> **not** an SSR page and **not** a separate codebase.
>
> **Drift lesson:** an earlier version of this note said the landing was "a separate codebase,
> NOT here" and that the fossil was "removed" — **both were WRONG.** That conclusion was written
> as "verified 2026-07-18" but never re-checked against the code, and it misled a Terms-links
> "fix". **"Verified" is not forever.** The stale, unreferenced `ntssign-landing-v3.html` fossil
> was still present and is **removed in this commit**.

---

## Module Map

The backend is **20 NestJS modules** under `apps/backend/src/` — files with a `.module.ts` wired into `AppModule` (hard count 2026-07-19: 9 Domain · 4 Integrations · 6 Supporting · 1 Infra). Grouped by role below. Note: `common`, `config`, and `observability` are utility folders, **not** wired modules (no `.module.ts`), so they don't count toward the 20. (Was 19 until the `health` module was added on 2026-07-19 — "verified" counts drift as code changes.)

### Domain

| Module | Responsibility |
|--------|---------------|
| `documents` | Core **contract** (BoldSign) lifecycle: draft CRUD, send, document-type listing; hosts the BoldSign webhook, public signing, and Resend-bounce webhook controllers |
| `receipts` | DIRECT_PDF generation for **both receipts** (`documents/receipt`) **and invoices** (`documents/invoice`) — builds the PDF, stores it to R2, emails it |
| `templates` | Serves the tenant's template catalog per category (RECEIPT/CONTRACT/INVOICE) with active-default state + preview URLs; sets the active template |
| `customers` | CRUD/listing of `Customer` records (personal/business), per-user tenant isolation, soft delete |
| `billing` | Current-period usage/quotas per tenant (contracts + receipts); plan defaults in `plan-defaults.ts` |
| `company-profile` | Read/update the tenant `CompanyProfile`; first-write-wins auto-detected timezone |
| `users` | User self-service (`/users/me`), CRUD, account-request handling, admin password resets |
| `auth` | Login/register/logout, JWT via httpOnly cookie, password change/forgot/reset; `JwtAuthGuard` |
| `legal` | Legal-acceptance gate: serves the active Terms/Privacy version, records per-user acceptance (IP captured), append-only; blocks a draft from being activated ("the lawyer is the gate") |

### Integrations

| Module | Responsibility |
|--------|---------------|
| `boldsign` | Concrete BoldSign integration: create-from-template, send, remind, download signed PDF, HMAC webhook verification |
| `signature-provider` | Thin provider-abstraction facade over BoldSign (decouples the app from a single e-sign vendor) |
| `email` | Resend transactional email + Resend/Svix webhook verification for bounces |
| `storage` | Cloudflare R2 object storage (S3-compatible SDK) for document PDFs; boots disabled if unconfigured |

### Supporting

| Module | Responsibility |
|--------|---------------|
| `admin` | Superadmin-only management of `DocumentType`/`FormDefinition`/`SignatureTemplate`/`UserDocumentConfig` + admin actions, written to an append-only `AdminAuditLog`; root-master-guarded |
| `notifications` | Channel fan-out (currently email) + hourly cron (`DeferredNotifyService`) that notifies creators when a future-dated document's issue date arrives |
| `leads` | Public two-step marketing-lead capture from the post-signature page |
| `contact` | Public contact form protected by a Cloudflare Turnstile guard |
| `observability` | Sentry PII/secret scrubbing (`scrubEvent`), kept byte-identical with the frontend copy — utility, no module file (not one of the 19) |
| `version` | Public `GET /version` returning the running git commit / build info |
| `health` | Public `GET /health` (liveness, never touches the DB) + `GET /health/ready` (readiness, `SELECT 1`, 503 if Postgres unreachable); minimal `{status}` body, no sensitive info |

### Infra

| Module | Responsibility |
|--------|---------------|
| `prisma` | `PrismaService` (global DB access) with connect/shutdown hooks |
| `common` | Pure shared helpers (tenant-timezone date math, receipt resend policy, resend cooldown) — utilities, no module file |
| `config` | Env-var helper (`getRequiredEnv`) — utility, no module file |

---

## Document Model & Lifecycle

There is **one** `Document` model (table `documents`) backing all document families. What a document IS comes from its `DocumentType` row, not a subclass.

### Document types

`DocumentType` is a **seeded DB table** (not a Prisma enum), each row carrying a `code` and a `generationMode`:

| `code` | `generationMode` | `TemplateCategory` | Backed by |
|--------|------------------|--------------------|-----------|
| (contract type, e.g. `CONSTRUCTION_CONTRACT`) | `BOLDSIGN` | `CONTRACT` | BoldSign `SignatureTemplate` |
| `PAYMENT_RECEIPT` | `DIRECT_PDF` | `RECEIPT` | `ReceiptTemplate` (base PDF + coordinates) |
| `INVOICE` | `DIRECT_PDF` | `INVOICE` | `ReceiptTemplateStandard.renderMode` = `acroform-overlay` (default) or legacy `acroform` |

- **Receipts and invoices are NOT separate models.** Each is a `Document` row whose type code is `PAYMENT_RECEIPT` / `INVOICE`. The generated PDF is a `DocumentFile` with `fileType = RECEIPT` (that enum value is reused for invoice PDFs too — there is no `INVOICE` file type).
- The DIRECT_PDF render engine for invoices lives on `ReceiptTemplateStandard.renderMode`, not on the document. See [invoice-pdf-strategy.md](invoice-pdf-strategy.md).

### Status lifecycle

`DocumentStatus` enum (verbatim): `DRAFT`, `SENT`, `SEND_FAILED`, `VIEWED`, `SIGNED`, `COMPLETED`, `CANCELLED`.

**Contract flow (BoldSign-driven):**

```
1. User creates DRAFT         → POST /documents/draft
2. User sends document        → POST /documents/:id/send
                                  ↳ SignatureProvider → BoldSign create + deliver
                                  ↳ (send failure) → status = SEND_FAILED
3. Recipient views            → BoldSign webhook → VIEWED
4. Recipient signs            → BoldSign webhook → SIGNED
5. All parties complete       → BoldSign webhook → COMPLETED
                                  ↳ BillingService records usage
6. User downloads signed PDF  → served from R2
```

### Cancelled vs Void vs Delete

These are **three different mechanisms** on the `Document` model — see [document-lifecycle.md](document-lifecycle.md) for the full rule:

| Mechanism | Field | Meaning |
|---|---|---|
| **Cancelled** | `status = CANCELLED` + `cancelledAt` | A real lifecycle state for a not-yet-issued document |
| **Void** (receipts/invoices) | `supersededAt` (+ `supersedesId` on the correction) | **Derived** state: a reissue creates a new document that supersedes the original; the original's status stays `SENT` but reads as VOID |
| **Delete** | `deletedAt` | Soft-delete, distinct from Cancelled |

There is no `voidedAt` field — VOID is derived from `supersededAt`.

---

## Multi-Tenancy Model

Tenant = `CompanyProfile`. Every resource (documents, users, billing) is scoped to a tenant via `companyProfileId`.

Isolation is enforced at the **application layer** — every query filters by the requesting user's `companyProfileId`. There is no database-level row security (RLS) yet; that is a future hardening item.

```
CompanyProfile (tenant)
    ├── Users (MASTER / ADMIN / USER)
    ├── Documents (contracts, receipts, invoices — one model, typed by DocumentType)
    ├── DocumentTypes + FormDefinitions (schemaJson) + SignatureTemplates / ReceiptTemplates
    ├── UserDocumentConfig (assigns form+template per user per document type)
    ├── Customers (personal / business)
    └── Billing (monthly usage, plan limits, overage)
```

Form schemas are stored in `FormDefinition.schemaJson` and rendered dynamically in the frontend. See [schema-driven-forms.md](schema-driven-forms.md).

---

## Authentication

- **Web users:** JWT stored in HTTP-only cookie (`ntssign_access_token`)
- **API consumers (B2B):** API Keys — see [b2b-integration.md](b2b-integration.md)
- **Public document links** (the recipient signing link + the signature-complete page): a
  **server-signed token** — an HMAC over a small payload (`documentId`, expiry, purpose) using
  **`PUBLIC_LINK_SECRET`** (kept separate from `JWT_SECRET`), verified server-side in the public
  controllers under `documents/`. This is a **third auth path**, distinct from the web JWT and B2B
  API keys — no session cookie is involved. (For the exact token construction, the code is the
  source of truth.)

JWT payload: `{ sub, email, role, companyProfileId }`

---

## Testing

The backend has three CI test layers (`.github/workflows/ci.yml`, on every push + PR to `main`/`develop`):

- **Unit** (`npm test`) — service/logic tests with mocked Prisma.
- **e2e on real Postgres** (`npm run test:e2e`) — boots the real `AppModule` against an isolated `*_test` database (Postgres 16 service container), driving the same HTTP endpoints the frontend + BoldSign hit. A mocked DB can be green while the real one is broken; these are the guardrail against that.
- **Frontend lint** (`npm run lint`).

> ### ⚠️ A green e2e run does NOT prove the frontend works
>
> The e2e tests are **backend/API-only** — they boot the NestJS app and drive its HTTP endpoints, but **never load the Next.js frontend**. A rendering or wiring bug in the UI sails past a green e2e run untouched. To confirm the owner actually *sees* a change, you must verify the **real component that mounts the view** — not just that the API returns 200.

See [../development/local.md](../development/local.md) for how to run the tests locally.

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | NestJS 11 | Module system maps cleanly to domain boundaries; built-in DI; TypeScript-first |
| ORM | Prisma 6 | Type-safe queries; first-class migration tooling; schema as single source of truth |
| Database | PostgreSQL 16 | ACID compliance; JSONB for flexible form data; proven for multi-tenant workloads |
| Frontend | Next.js 16 + React 19 | App Router for server components; Tailwind 4 for rapid UI |
| Contract signing | BoldSign | Fits construction industry; template-based workflow; webhook events |
| Receipt/invoice PDFs | In-house DIRECT_PDF | Full control over layout + cost; no per-document provider fee for financial docs |
| Provider abstraction | `signature-provider` | Swap BoldSign for another provider without touching document business logic |
| PDF storage | Cloudflare R2 | S3-compatible; cheap egress; separate `R2_DOCS_*` credentials |
| Email | Resend | Simple transactional API; Svix-signed bounce webhooks |
| Auth (web) | JWT + HTTP-only cookie | XSS-resistant; works with SSR; no manual token management on client |
| Auth (B2B) | API Keys | Simpler than OAuth2 for server-to-server; sufficient for current integration scope |
| Hosting | Oracle Cloud VM | Cost-effective for early stage; single VM scales vertically before needing K8s |
| DNS + SSL | Cloudflare | Free SSL termination; DDoS protection; simple A record management |

---

## Known limitations & standing decisions

**Current-state facts, not a backlog.** Each is here because a developer *will* hit it and needs the **why** — the improvement *tasks* live in the Drive backlog, these are how the system **is** today.

- **The landing IS in this repo** (corrected 2026-07-19). The public `ntssign.com` landing is a Next.js **static export** of `apps/frontend/app/(marketing)/`, FTP'd to **SiteGround** (behind Cloudflare) by `.github/workflows/deploy-landing.yml` — deployed alongside the *app* (`app.ntssign.com`) and *API* (`api.ntssign.com`), all from this repo. An earlier note here wrongly called the landing "a separate codebase, not here" and claimed the `ntssign-landing-v3.html` fossil was "removed" — the fossil was still present (unreferenced) and is removed in this commit. This was **drift**: a stale "verified 2026-07-18" conclusion that was never re-checked against the code. Lesson: **"verified" is not forever — re-check against the code before trusting a doc claim.**

- **The database connection pool is untuned.** Prisma uses its default pool; it has not been sized for load. This is a **tuning gap, not a Prisma limitation** — it's changeable (connection-limit params on `DATABASE_URL`, or an explicit pool config) when load requires it.

- **BoldSign metadata keys still use the `noasign` prefix.** The product was renamed noasign → ntssign, but the metadata keys written into BoldSign documents were **deliberately left as `noasign`**: changing them breaks correlation with the documents **already created** in BoldSign, which carry the old keys. This is **historical, not an oversight.** ⚠️ **Trap:** whoever undertakes the full noasign → ntssign rename (a Drive-backlog task) must account for this — a naive rename breaks prod BoldSign lookups.

- **The schema-driven-forms admin UI is not in production — by decision.** New clients are onboarded via **DB scripts**, not an admin panel. The panel exists (validation shipped; a preview component has a rendering bug and is unused). This was **chosen**, not skipped for lack of time — hand-running scripts is fine at current volume. **Revisit condition:** when client volume justifies a self-serve admin UI. (A decision without its revision condition is one nobody dares revisit.) See [schema-driven-forms.md](schema-driven-forms.md).

- **The dashboard is coupled to a parallel request fan-out that includes billing.** `loadWorkspace` fetches several endpoints in parallel to build the dashboard, so **a billing failure degrades the whole dashboard**, not just the billing card. Partially mitigated (fan-out reduced 9 → 4 requests). This is the fact to reach for when the dashboard behaves oddly and the cause isn't obvious.

---

## Scalability Path

See [b2b-integration.md](b2b-integration.md) for the B2B API roadmap.

Short-term vertical scaling (single VM) → medium-term: separate DB VM → long-term: horizontal scaling with load balancer + read replicas.

The modular architecture (NestJS modules, provider abstraction, tenant isolation) is designed to extract services independently when load requires it.
