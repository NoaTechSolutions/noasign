# NTSsign — Architecture Overview

## System Purpose

NTSsign is a multi-tenant SaaS platform that manages the full lifecycle of business documents requiring electronic signatures. It acts as a **signature orchestration layer**: it holds the document data, drives the workflow, and delegates the actual signing to an external provider (BoldSign).

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
                                              │
                           ┌──────────────────▼─────────────────────────┐
                           │  BoldSign (external signature provider)     │
                           │  Webhooks → /boldsign/webhooks/events       │
                           └────────────────────────────────────────────┘
```

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

| Module | Responsibility |
|--------|---------------|
| `AuthModule` | JWT authentication, password flows, rate limiting |
| `UsersModule` | User CRUD, roles (MASTER/ADMIN/USER), account requests |
| `CompanyProfileModule` | Tenant data, billing plan, company metadata |
| `DocumentsModule` | Full document lifecycle: draft → sent → signed → completed |
| `BillingModule` | Monthly usage tracking, overage calculation |
| `BoldSignModule` | BoldSign API client (create documents, get links, sync status) |
| `SignatureProviderModule` | Abstract provider interface (enables swapping BoldSign later) |
| `PrismaModule` | Database connection, global singleton |

---

## Multi-Tenancy Model

Tenant = `CompanyProfile`. Every resource (documents, users, billing) is scoped to a tenant via `companyProfileId`.

Isolation is enforced at the **application layer** — every query filters by the requesting user's `companyProfileId`. There is no database-level row security (RLS) yet; that is a future hardening item.

```
CompanyProfile (tenant)
    ├── Users (MASTER / ADMIN / USER)
    ├── Documents (with full lifecycle)
    ├── DocumentTypes + FormDefinitions (schemaJson) + SignatureTemplates (fieldMappingJson)
    ├── UserDocumentConfig (assigns form+template per user per document type)
    └── Billing (monthly usage, plan limits, overage)
```

Form schemas are stored in `FormDefinition.schemaJson` and rendered dynamically in the frontend. Each client (INDIVIDUAL or BUSINESS user) can have multiple document type configurations via `UserDocumentConfig`. See [schema-driven-forms.md](schema-driven-forms.md) for full spec.

---

## Authentication

- **Web users:** JWT stored in HTTP-only cookie (`ntssign_access_token`)
- **API consumers (B2B):** API Keys — see [b2b-integration.md](b2b-integration.md)

JWT payload: `{ sub, email, role, companyProfileId }`

---

## Data Flow: Document Lifecycle

```
1. User creates DRAFT         → POST /v1/documents/draft
2. User sends document        → POST /v1/documents/:id/send
                                  ↳ BoldSignService.createDocumentFromTemplate()
                                  ↳ BoldSign delivers to recipient
3. Recipient views document   → BoldSign sends webhook → DocumentStatus = VIEWED
4. Recipient signs            → BoldSign sends webhook → DocumentStatus = SIGNED
5. All parties complete       → BoldSign sends webhook → DocumentStatus = COMPLETED
                                  ↳ BillingService.recordUsage()
                                  ↳ (future) OutboundWebhookService.dispatch()
6. User downloads signed PDF  → GET /v1/documents/:id/final-pdf
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | NestJS 11 | Module system maps cleanly to domain boundaries; built-in DI; TypeScript-first |
| ORM | Prisma 6 | Type-safe queries; first-class migration tooling; schema as single source of truth |
| Database | PostgreSQL 16 | ACID compliance; JSONB for flexible form data; proven for multi-tenant workloads |
| Frontend | Next.js 16 + React 19 | App Router for server components; Tailwind 4 for rapid UI |
| Signature provider | BoldSign | Fits construction industry; template-based workflow; webhook events |
| Provider abstraction | `SignatureProviderModule` | Swap BoldSign for another provider without touching document business logic |
| Auth (web) | JWT + HTTP-only cookie | XSS-resistant; works with SSR; no manual token management on client |
| Auth (B2B) | API Keys | Simpler than OAuth2 for server-to-server; sufficient for current integration scope |
| Hosting | Oracle Cloud VM | Cost-effective for early stage; single VM scales vertically before needing K8s |
| DNS + SSL | Cloudflare | Free SSL termination; DDoS protection; simple A record management |

---

## Scalability Path

See [b2b-integration.md](b2b-integration.md) for the B2B API roadmap.

Short-term vertical scaling (single VM) → medium-term: separate DB VM → long-term: horizontal scaling with load balancer + read replicas.

The modular architecture (NestJS modules, provider abstraction, tenant isolation) is designed to extract services independently when load requires it.
