# NTSsign — Pending Work

Last updated: 2026-04-02

This file tracks what is pending across all areas. Organized by priority tier.

---

## Tier 0 — Pre-launch (before first real customer)

| Item | Area | Notes |
|------|------|-------|
| Run `npx prisma migrate deploy` on production DB | DB | Adds `lastSentRecipientEmail` column. Required before launch. |
| Set all required env vars on Oracle VM | Infra | See `docs/deployment/production.md` for the full list |
| Configure GitHub Secrets for deploy pipeline | CI/CD | `PROD_BACKEND_HOST`, `PROD_FRONTEND_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY` |
| Create GitHub "production" environment with required reviewers | CI/CD | Prevents accidental deploy to prod |
| Set up Oracle VM (Node 20, pm2, nginx, certbot) | Infra | See `docs/deployment/production.md` |
| Configure Cloudflare DNS (A records → Oracle VM IP) | Infra | `api.ntssign.com` and `app.ntssign.com` |
| Set Cloudflare SSL to Full (strict) | Infra | Requires valid cert on the VM first |
| Create `ecosystem.config.js` on production VM | Infra | pm2 process definitions |
| Bootstrap master user on production | Backend | `npm run bootstrap:production` |
| Purchase and configure BoldSign license | Product | Set `BOLDSIGN_API_KEY` and `BOLDSIGN_BRAND_ID` in prod |

---

## Tier 1 — Phase 1: B2B API foundation

These items are required before the external SaaS can integrate with NTSsign.

See full design in [b2b-integration.md](b2b-integration.md).

| Item | Area | Notes |
|------|------|-------|
| API versioning: `/v1/` global prefix | Backend | `app.setGlobalPrefix('v1')` in main.ts |
| Install + configure `@nestjs/swagger` | Backend | Spec served at `/v1/docs` (dev/staging only) |
| Add Swagger decorators to all controllers | Backend | `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` |
| `ApiKey` Prisma model + migration | DB | `id`, `keyHash`, `name`, `companyProfileId`, `lastUsedAt`, `expiresAt`, `revokedAt` |
| API key generation endpoint | Backend | `POST /v1/api-keys` — MASTER role only |
| API key revocation endpoint | Backend | `DELETE /v1/api-keys/:id` — MASTER role only |
| `ApiKeyGuard` | Backend | Hashes incoming key, looks up tenant |
| `AnyAuthGuard` | Backend | Accepts JWT cookie OR API Key |

---

## Tier 2 — Phase 2: Outbound webhooks

Required for the external SaaS to receive real-time document events.

| Item | Area | Notes |
|------|------|-------|
| `WebhookEndpoint` Prisma model + migration | DB | `url`, `secret`, `events[]`, `companyProfileId`, `isActive` |
| Webhook registration endpoint | Backend | `POST /v1/webhooks` — MASTER role only |
| Webhook list/delete endpoints | Backend | `GET /v1/webhooks`, `DELETE /v1/webhooks/:id` |
| `OutboundWebhookService` | Backend | Dispatch, HMAC-SHA256 signing, single retry on failure |
| Hook document status changes | Backend | Call OutboundWebhookService on VIEWED, SIGNED, COMPLETED, CANCELLED |

---

## Tier 3 — Phase 3: Hardening

Not blocking for B2B integration but needed before scale.

| Item | Area | Notes |
|------|------|-------|
| Per-tenant rate limiting | Backend | `@nestjs/throttler` keyed by `companyProfileId` |
| Correlation IDs | Backend | `X-Request-Id` header propagated through logs |
| Webhook retry queue | Backend | Bull + Redis, exponential backoff, dead-letter |
| Audit log model | DB | Record sensitive operations: send, cancel, key create/revoke |
| DB row-level security (RLS) | DB | PostgreSQL policies per tenant, defense-in-depth |
| Increase test coverage to 70% | Testing | Prioritize DocumentsService and BillingService |

---

## Known Technical Debt

| Item | Risk | Notes |
|------|------|-------|
| `loadWorkspace` fires 7 parallel requests | Medium | If billing endpoint fails, entire dashboard fails. Separate critical vs non-critical requests. |
| In-memory rate limiter | Low | Won't work across multiple server instances. Fine for single VM. Replace with Redis when scaling horizontally. |
| `BOLDSIGN_WEBHOOK_SECRET` defaults to empty string | Medium | Webhooks fail verification silently if not set. Must be in production env. |
| No DB connection pooling config | Low | Prisma default pool size may be insufficient under load. Add `connection_limit` to DATABASE_URL. |

---

## Completed

- ✅ Multi-tenant document lifecycle (DRAFT → COMPLETED → CANCELLED)
- ✅ BoldSign integration (create, send, webhook, PDF download)
- ✅ Usage-based billing with overage
- ✅ User management with MASTER / USER roles
- ✅ Company profile management
- ✅ Account request intake flow
- ✅ Password reset flow (secure token, 30-min expiry)
- ✅ simulate-* endpoints blocked in production
- ✅ PUBLIC_LINK_SECRET separated from JWT_SECRET
- ✅ `lastSentRecipientEmail` — resend cooldown bypass when email changes
- ✅ CI pipeline (tests + lint on every PR)
- ✅ Deploy pipeline (SSH to Oracle VM on push to main)
- ✅ Full production deployment guide (Oracle + Cloudflare)
- ✅ Architecture documentation
- ✅ B2B integration design decisions documented
