# NTSsign Documentation

**NTSsign** is a multi-tenant SaaS platform for creating, sending, and tracking business documents — signed contracts (via BoldSign) and financial documents (receipts + invoices, generated in-house). Built by NoaTechSolutions.

> **How this folder is governed.** A doc lives here only if it passes the test _"is this still true in 6 months?"_ — durable truth about the product (architecture, business rules, processes). Day-to-day session state (status snapshots, this-week priorities) lives in Drive, not in git. If you find a doc that has gone stale, fix it or flag it — a doc that lies is worse than no doc.

---

## Audiences

| Audience | Folder | Contents |
|---|---|---|
| Developers | [`architecture/`](architecture/) [`development/`](development/) [`deployment/`](deployment/) | Architecture, business rules, setup, deploy |
| Product team | [`product/`](product/) | Product overview, roadmap, pricing, UX patterns, design system |
| Clients (end users) | [`client/`](client/) | Getting started, creating documents, signing, FAQ |
| Uso interno (NTSolutions) | [`external/`](external/) | API integration — solo para equipos NTSolutions |

---

## Architecture & business rules

| File | Description |
|---|---|
| [architecture/overview.md](architecture/overview.md) | System architecture, module map (21 modules), document model & lifecycle, external services |
| [architecture/document-lifecycle.md](architecture/document-lifecycle.md) | **Business rule** — Delete vs Cancel vs Void: the three kill-mechanisms, why each is stored differently, and the code that implements them |
| [architecture/document-types-coupling-analysis.md](architecture/document-types-coupling-analysis.md) | How coupled contracts / receipts / invoices are today, and why the answer is logical separation in the monolith (not microservices) |
| [architecture/schema-driven-forms.md](architecture/schema-driven-forms.md) | Dynamic forms: `FormDefinition.schemaJson` + `SignatureTemplate` field mapping |
| [architecture/invoice-pdf-strategy.md](architecture/invoice-pdf-strategy.md) | DIRECT_PDF invoice generation: AcroForm-overlay engine vs legacy AcroForm |
| [architecture/templates-module.md](architecture/templates-module.md) | Templates module: catalog per category, resolver, per-tenant visibility, preview PNGs |
| [architecture/receipt-billing-model-c.md](architecture/receipt-billing-model-c.md) | Receipt billing "Model C": monthly quota + overage per plan |
| [architecture/pdf-storage-r2.md](architecture/pdf-storage-r2.md) | PDF persistence in Cloudflare R2 (implemented, live in prod) |
| [architecture/email-delivery-and-bounces.md](architecture/email-delivery-and-bounces.md) | Resend email + async bounce webhooks (SEND_FAILED), per-env config |
| [architecture/mobile-bottom-sheet-pattern.md](architecture/mobile-bottom-sheet-pattern.md) | **Standard** mobile bottom-sheet + SubSheetHeader back-nav; react-pdf viewer |
| [architecture/b2b-integration.md](architecture/b2b-integration.md) | API key auth, outbound webhooks, B2B integration design |
| [architecture/known-issue-setstate-in-effect.md](architecture/known-issue-setstate-in-effect.md) | Known issue: setState-in-effect pattern and where it's suppressed |

---

## Development & deployment

| File | Description |
|---|---|
| [development/local.md](development/local.md) | Local dev setup, ports, database, seeds, smoke/unit tests, BoldSign webhooks |
| [development/testing.md](development/testing.md) | The 3 CI test layers, the e2e-on-real-Postgres suite, how to run it locally, and **what it does NOT cover (the frontend)** |
| [deployment/production.md](deployment/production.md) | Production deploy guide, Oracle Cloud, nginx, SSL, pm2 |
| [deployment/staging.md](deployment/staging.md) | Staging environment setup and deploy process |
| [deployment/backups.md](deployment/backups.md) | Prod DB backup → R2, restore procedure, retention, staging |
| [deployment/prod-release-runbook.md](deployment/prod-release-runbook.md) | Step-by-step prod release runbook (backup → checks → merge → verify); reusable |
| [deployment/ssh-staging.md](deployment/ssh-staging.md) | SSH access to the staging VM |
| [deployment/github-actions.md](deployment/github-actions.md) | CI/CD pipeline setup, GitHub Actions, environment secrets |

---

## Operations (runbooks)

Repeatable procedures — how to do a thing, and how to read what the system tells you.

| File | Description |
|---|---|
| [operations/template-alta.md](operations/template-alta.md) | Checklist for adding a template, including the curated preview PNG spec (1190×1683, 2 files, and **never run `gen-template-thumbnails.js`**) |
| [operations/health-check.md](operations/health-check.md) | The staging deploy health check: what each stage checks, what each error message means, and the two nginx traps that cause false negatives |

---

## Product Docs

| File | Description |
|---|---|
| [product/saas-overview.md](product/saas-overview.md) | Product vision, modules, document lifecycle, roles |
| [product/roadmap.md](product/roadmap.md) | Product direction by phase (durable) — the current arc and the future feature catalog |
| [product/saas-ux-patterns.md](product/saas-ux-patterns.md) | **Canonical** UX behavior patterns §1–§10 (contextual edit, auto-format, validation, row exit, previews…) |
| [product/design-system.md](product/design-system.md) | Visual tokens: color, typography, buttons, dark mode, spacing (visual, not behavior) |
| [product/subscription-model.md](product/subscription-model.md) | Plans, pricing tiers, add-ons, feature matrix |
| [product/pricing-canonical.md](product/pricing-canonical.md) | **Source of truth** for plans + prices (BILLING_PLAN_CONFIG must match this) |
| [product/pricing-and-services.md](product/pricing-and-services.md) | Public-facing pricing and service packages |
| [product/pricing-client-onepager.md](product/pricing-client-onepager.md) | One-pager for client-facing pricing conversations |
| [product/pricing-internal-strategy.md](product/pricing-internal-strategy.md) | Internal pricing strategy and rationale |
| [product/sales-onepager.md](product/sales-onepager.md) | Sales one-pager |

---

## Client Docs

| File | Description |
|---|---|
| [client/01-getting-started.md](client/01-getting-started.md) | Account setup, login, dashboard overview |
| [client/02-creating-documents.md](client/02-creating-documents.md) | How to create and send a document for signature |
| [client/03-signing-process.md](client/03-signing-process.md) | What the recipient experiences when signing |
| [client/04-faq.md](client/04-faq.md) | Frequently asked questions |

---

## External / Integration Docs

| File | Description |
|---|---|
| [external/01-integration-guide.md](external/01-integration-guide.md) | Authentication, API keys, endpoints, versioning |
| [external/02-webhook-events.md](external/02-webhook-events.md) | Event catalog, payload format, signature verification |

---

## Project status & backlog — in Drive

Living, day-to-day state: **session-state** that changes constantly and doesn't pass the 6-month test, so it lives in **Drive**, maintained by Claude. The repo keeps only a **stub with the link** — ⚠️ don't edit the stubs, the original is in Drive:

| In repo | What it is |
|---|---|
| [STATUS.md](STATUS.md) | **Stub → Drive**: living project status snapshot (environments, shipped, in-progress) |
| [architecture/pending.md](architecture/pending.md) | **Stub → Drive**: backlog / pending work (durable facts were rescued to `overview.md`) |
| [SESSION-RESUME.md](SESSION-RESUME.md) | End-of-session resume / next-step handoff (session-state) |

---

## Landing page & misc

The public landing (SiteGround) and one-off setup guides:

| File | Description |
|---|---|
| `ntssign-landing-v3.html` | Public landing page (deployed to SiteGround) |
| `siteground.md`, `siteground-landing-setup.md` | SiteGround hosting + landing deploy setup |
| `linear-tasks-landing-siteground.md` | Linear task list for the landing work |
| `CLAUDE_CODE_INSTRUCTIONS.md`, `INSTRUCCIONES-CLAUDE-CODE-LANDING.md` | Claude Code instructions for the landing project |
| `PANEL-EXTRACTION-GUIDE.md` | Guide for extracting UI panels |
| `designs/*.html` | Static HTML mockups (billing, customers, dashboard, profile) |

---

## PDF Export

To export all documentation as PDF:

```bash
npm install -g md-to-pdf
bash docs/export-pdf.sh
```

PDF files are written to `docs/pdf/`, mirroring the folder structure.

---

_Maintained by NoaTechSolutions. Index last verified: 2026-07-17._
