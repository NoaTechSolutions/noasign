# NTSsign — B2B API Integration Design

## Context

NTSsign will be consumed by **external SaaS platforms** built by NTSolutions. These platforms have their own customers and their own product scope, but delegate document signing to NTSsign.

The integration pattern is **platform-as-a-service**: the external SaaS authenticates as a tenant, creates and manages documents on behalf of its own users, and receives real-time status updates via webhooks.

```
External SaaS (future)               NTSsign
┌───────────────────────┐            ┌──────────────────────────┐
│  Own customers        │            │  Tenant: ExternalSaaS    │
│  Own auth system      │──API Key──▶│  Documents               │
│  Own UI/UX            │◀─Webhook───│  Billing (per document)  │
│                       │            │  BoldSign orchestration  │
└───────────────────────┘            └──────────────────────────┘
```

---

## Authentication: API Keys

Web users authenticate via JWT cookie. External SaaS platforms authenticate via **API Keys**.

### Why API Keys, not OAuth2

OAuth2 Client Credentials adds significant implementation complexity (token endpoint, client registry, token rotation, scopes). For server-to-server integration between two NTSolutions products, API Keys provide the same security guarantees with much simpler implementation. OAuth2 can be layered on top later when third-party integrators are onboarded.

### Design

Each tenant (`CompanyProfile`) can have one or more API Keys. A key is a random 32-byte secret, stored as SHA-256 hash, never returned after creation.

```
ApiKey
  id             CUID
  keyHash        String (SHA-256 of the raw key)  UNIQUE
  name           String (human label, e.g. "prod-key")
  companyProfileId  → CompanyProfile
  createdAt
  lastUsedAt     (nullable, updated on each request)
  expiresAt      (nullable)
  revokedAt      (nullable)
```

### Request Format

```http
X-API-Key: ntssign_<base64url_32bytes>
```

Or alternatively in Authorization header:

```http
Authorization: Bearer ntssign_<base64url_32bytes>
```

The prefix `ntssign_` distinguishes API keys from JWT tokens at the guard level.

### Guard Behavior

`ApiKeyGuard` hashes the incoming key and looks it up in the database. If found and not revoked/expired, it injects the associated `CompanyProfile` as the tenant context — equivalent to how JWT injects `companyProfileId` from the token payload.

Endpoints can accept both auth methods:

```typescript
@UseGuards(AnyAuthGuard)  // accepts JWT cookie OR API Key
```

---

## API Versioning

All routes are prefixed with `/v1/`. Version is in the URL (not headers) for simplicity and proxy compatibility.

```
/v1/documents/draft
/v1/documents/:id/send
/v1/billing/current-usage
```

When breaking changes are required, `/v2/` routes are added while `/v1/` remains active for a documented deprecation window. Routes are never removed without a migration path.

**Implementation:** NestJS global prefix `app.setGlobalPrefix('v1')`.

---

## OpenAPI / Swagger

All endpoints are documented via `@nestjs/swagger` decorators. The spec is served at `/v1/docs` (development and staging only; disabled in production unless explicitly enabled).

The generated spec is the **contract** between NTSsign and consuming SaaS platforms. Any breaking change to the spec requires a version bump.

---

## Outbound Webhooks

When NTSsign processes document events, it notifies registered external SaaS endpoints in real time.

### Design

Each tenant can register one or more webhook endpoints:

```
WebhookEndpoint
  id             CUID
  companyProfileId  → CompanyProfile
  url            String (HTTPS required in production)
  secret         String (stored encrypted, used for HMAC-SHA256 signing)
  events         String[] (e.g. ["document.completed", "document.signed"])
  isActive       Boolean
  createdAt
```

### Event Catalog

| Event | Fired when |
|-------|-----------|
| `document.created` | Draft document is created |
| `document.sent` | Document is sent to BoldSign |
| `document.viewed` | Recipient opens the signing link |
| `document.signed` | Recipient signs |
| `document.completed` | All parties complete signing |
| `document.cancelled` | Document is cancelled |

### Payload Format

```json
{
  "event": "document.completed",
  "timestamp": "2026-04-02T10:30:00Z",
  "tenantId": "cmp_xxx",
  "data": {
    "documentId": "doc_xxx",
    "documentNumber": "INS-2026-001",
    "status": "COMPLETED",
    "completedAt": "2026-04-02T10:30:00Z"
  }
}
```

### Security

Each delivery includes:

```http
X-NTSsign-Signature: sha256=<hmac_hex>
X-NTSsign-Event: document.completed
X-NTSsign-Delivery: <uuid>
```

The receiving SaaS verifies the signature using the shared secret. Same pattern as BoldSign uses against NTSsign.

### Delivery

- **Phase 1 (MVP):** Fire-and-forget with single retry after 5s on non-2xx response
- **Phase 2:** Bull queue + Redis for persistent retry with exponential backoff and dead-letter storage

---

## Per-Tenant Rate Limiting

Beyond the current auth-endpoint rate limiting, API Key requests are throttled per tenant:

| Plan | Requests/minute |
|------|----------------|
| LAUNCH | 60 |
| SCALE | 300 |
| PRO_UNLIMITED | 1000 |

**Implementation:** `@nestjs/throttler` with custom storage key derived from `companyProfileId`.

---

## Implementation Roadmap

### Phase 1 — Minimum for external SaaS integration

| Item | What | Status |
|------|------|--------|
| API versioning | `/v1/` global prefix on all routes | ⬜ Pending |
| Swagger/OpenAPI | `@nestjs/swagger`, spec at `/v1/docs` | ⬜ Pending |
| `ApiKey` Prisma model | Migration + model | ⬜ Pending |
| API key generation endpoint | `POST /v1/api-keys` (MASTER only) | ⬜ Pending |
| `ApiKeyGuard` | Hash lookup, tenant injection | ⬜ Pending |
| `AnyAuthGuard` | Accepts JWT or API Key | ⬜ Pending |

### Phase 2 — Outbound webhooks

| Item | What | Status |
|------|------|--------|
| `WebhookEndpoint` Prisma model | Migration + model | ⬜ Pending |
| Webhook registration endpoint | `POST /v1/webhooks` (MASTER only) | ⬜ Pending |
| `OutboundWebhookService` | Dispatch, HMAC signing, fire-and-forget | ⬜ Pending |
| Hook document events | Call OutboundWebhookService on status changes | ⬜ Pending |

### Phase 3 — Hardening

| Item | What | Status |
|------|------|--------|
| Per-tenant rate limiting | `@nestjs/throttler` per `companyProfileId` | ⬜ Pending |
| Webhook retry queue | Bull + Redis, exponential backoff | ⬜ Pending |
| Correlation IDs | Request tracing header `X-Request-Id` | ⬜ Pending |
| Audit log | `AuditLog` model — who did what, when, from which IP/key | ⬜ Pending |
| DB row-level security | PostgreSQL RLS policies per tenant | ⬜ Pending |

---

## What Does NOT Change

The existing web application continues to work identically. API Keys are an additional auth path, not a replacement. The JWT cookie flow for web users is unchanged.

No existing endpoints are broken — versioning is additive.
