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
   │   SiteGround     │    │              Oracle Cloud VM                │
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
  ├── ntssign.com     → SiteGround (landing estática HTML/CSS/JS)
  ├── app.ntssign.com → Oracle Cloud VM (Next.js :3001)
  └── api.ntssign.com → Oracle Cloud VM (NestJS :3000)
```

---

## Module Map

The backend is 21 NestJS modules under `apps/backend/src/`. Grouped by role:

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
| `observability` | Sentry PII/secret scrubbing (`scrubEvent`), kept byte-identical with the frontend copy |
| `version` | Public `GET /version` returning the running git commit / build info |

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
1. User creates DRAFT         → POST /v1/documents/draft
2. User sends document        → POST /v1/documents/:id/send
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

## Scalability Path

See [b2b-integration.md](b2b-integration.md) for the B2B API roadmap.

Short-term vertical scaling (single VM) → medium-term: separate DB VM → long-term: horizontal scaling with load balancer + read replicas.

The modular architecture (NestJS modules, provider abstraction, tenant isolation) is designed to extract services independently when load requires it.
