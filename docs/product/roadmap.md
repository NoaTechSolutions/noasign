# NTSsign — Product Roadmap

_This file is **direction**, not this-week priorities. Day-to-day priorities (what's being worked on right now) live in Drive (the session-resume), per the docs governance rule._
_Last reviewed: 2026-07-17._

> ## How to read this file
> Two kinds of entries, kept **visually separate on purpose** — in 6 months you must be able to tell committed work from wishes at a glance:
>
> - ## ✅ DECISION — committed direction, owner-decided and dated. This is where the product is going.
> - ## 💭 IDEA — a catalogued possibility (mostly from the April 2026 planning). **Not committed. Build status not re-verified.** Do not treat as planned work or as "coming soon".

---

## ✅ The arc — committed direction

**DECISION · owner · 2026-07-17.** The product is being built in phases:

| Phase | Focus | Status |
|---|---|---|
| **FASE 1** | Receipt **templates** module | ✅ shipped to staging (verified) |
| **FASE 2** | **Invoices** (DIRECT_PDF) | ✅ live |
| **FASE 3** | **Owner signatures** | ▶️ next |
| **FASE 4** | **Superadmin · plans · Stripe** | ⏭️ ahead |

---

## ✅ Shipped

**Verified against code · 2026-07-17.** Only what was actually confirmed in the codebase:

- Receipt **templates module** (catalog, per-tenant visibility, preview PNGs) — [../architecture/templates-module.md](../architecture/templates-module.md)
- **Invoices** (DIRECT_PDF / AcroForm) — [../architecture/invoice-pdf-strategy.md](../architecture/invoice-pdf-strategy.md)
- **Receipts** + void / reissue (Model C billing) — [../architecture/receipt-billing-model-c.md](../architecture/receipt-billing-model-c.md)
- **Document lifecycle** (Delete / Cancel / Void) — [../architecture/document-lifecycle.md](../architecture/document-lifecycle.md)
- **Schema-driven forms** (dynamic document forms) — [../architecture/schema-driven-forms.md](../architecture/schema-driven-forms.md)
- **Customer management** (CRM-lite)
- **PDF storage in Cloudflare R2** — [../architecture/pdf-storage-r2.md](../architecture/pdf-storage-r2.md)
- **Resend email + async bounce webhooks** (SEND_FAILED) — [../architecture/email-delivery-and-bounces.md](../architecture/email-delivery-and-bounces.md)
- **Sentry** observability (front + back, PII-scrubbed)
- **e2e tests on real Postgres** in CI + staging deploy **health check** — [../development/testing.md](../development/testing.md), [../operations/health-check.md](../operations/health-check.md)
- **Production + staging environments live**, SSL, CI/CD pipelines (the `/v1` API prefix is **not** shipped — it's a pending B2B item; see [../architecture/b2b-integration.md](../architecture/b2b-integration.md))
- **Public landing page** (v1, EN/ES, dark mode, on SiteGround)

---

## 💭 Future catalog — IDEAS

> Everything below was catalogued in **April 2026** as possible future work. It is **preserved, not committed**. Build status was **NOT re-verified** in the 2026-07-17 pass **except where a schema probe is noted**. Confirm against code before relying on any "not built" assumption.
>
> Schema probes (2026-07-17) found **no implementation** for: multi-signer, automatic reminders, decline-to-sign, retention-by-plan, activity log, or the pay-per-contract flow.

### Signing & document lifecycle
- 💭 **Multi-signer / sequential signing** — 2+ signers with order. _(schema: `DocumentSigner` not present)_
- 💭 **Automatic reminders** — cron + BoldSign reminder API, configurable per workspace. _(schema: `reminderSentCount` not present)_
- 💭 **Document expiration** — auto-cancel unsigned docs past a window. _(⚠️ status **UNVERIFIED** — an `expiresAt` field exists but likely belongs to `ApiKey`, not `Document`; confirm before assuming either way)_
- 💭 **Decline to sign** — signer declines with a reason. _(schema: no `DECLINED` status)_

### Billing & retention
- 💭 **Pay-per-contract flow** — buy individual contract credits. _(plan name exists; `contractCredits` / `ContractCreditPurchase` not present — the flow is not built)_
- 💭 **Document retention & expiry by plan** — retain N years then notify + delete. _(schema: `storageExpiresAt` not present)_
- 💭 **Extended-retention add-on** — paid extra retention years.

### Growth
- 💭 **Viral loop** — subtle "Sent with NTSsign" branding on signing emails/pages.
- 💭 **Referral program** — refer a business → 1 month free.
- 💭 **Template marketplace** — pre-built templates (NDA, service agreement, etc.), some paid.

### Team & compliance (Pro / Scale+)
- 💭 **Audit trail PDF** — downloadable proof (who/IP/time/device/method).
- 💭 **SMS OTP signer verification** — one-time code before access.
- 💭 **Granular team roles** — Owner / Admin / Agent / Viewer beyond MASTER/ADMIN/USER.
- 💭 **Team activity log** — full audit of who did what. _(schema: `ActivityLog` not present)_

### Bulk & organization
- 💭 **Bulk send** — same document to many recipients, individual copies.
- 💭 **Document organization** — folders / projects.
- 💭 **Bulk PDF export** — ZIP of signed PDFs per period (audits).
- 💭 **Per-tenant analytics dashboard** — docs sent/signed, average sign time.
- 💭 **White-label signing portal** — tenant logo/colors/domain for the signer.

### Integrations & platform (Scale+ / long-term)
- 💭 **Integrations** — Google Drive/Dropbox (auto-save signed PDFs), HubSpot/Salesforce (doc from a CRM deal), Zapier.
- 💭 **Internal API + outbound webhooks** — for other NTSolutions platforms (NOT a public API product). Design: [../architecture/b2b-integration.md](../architecture/b2b-integration.md).
- 💭 **Payment at signing (Stripe)** — sign + pay a deposit in one flow.
- 💭 **In-person signing mode** — hand the tablet to the client. _(pending legal validation)_
- 💭 **Own signature engine (replace BoldSign)** — full control over UX/branding/cost/compliance. **Long-term, legally blocked** — see below.

---

## 💭 Own signature engine — legal blockers (reference)

**IDEA · long-term.** If NTSsign ever replaces BoldSign with an in-house engine, these must be cleared **before any implementation starts** (kept here because they're durable, expensive prerequisites, not a sprint):

- ESIGN Act (US) + UETA compliance validation
- eIDAS (EU) — SES / AES / QES classification
- Per-country regulations for target markets
- Tamper-evident seal (PDF/A, PKCS#7, timestamp authority)
- Identity verification standards (KBA, biometric, government ID scan)
- External legal counsel sign-off

---

_Roadmap direction is owner-decided; feature ideas are catalogued, not committed. When an idea becomes committed work, promote it to a ✅ DECISION with a date._
