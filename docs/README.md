# NTSsign Documentation

**NTSsign** is a multi-tenant SaaS platform for creating, sending, and tracking business documents with electronic signatures. Built by NoaTechSolutions.

---

## Audiences

| Audience | Folder | Contents |
|---|---|---|
| Developers | [`development/`](development/) [`deployment/`](deployment/) [`architecture/`](architecture/) | Setup, deployment, architecture, integrations |
| Product team | [`product/`](product/) | Feature overview, roadmap, pricing, subscription model |
| Clients (end users) | [`client/`](client/) | Getting started, creating documents, signing, FAQ |
| Uso interno (NTSolutions) | [`external/`](external/) | API integration — solo para equipos NTSolutions |

---

## Developer Docs

| File | Description |
|---|---|
| [STATUS.md](STATUS.md) | **Living project status snapshot** — environments, shipped, in-progress, ops gaps |
| [architecture/overview.md](architecture/overview.md) | System architecture, module map, data flow, technology decisions |
| [architecture/email-delivery-and-bounces.md](architecture/email-delivery-and-bounces.md) | Resend email + async bounce webhooks (SEND_FAILED), per-env config |
| [architecture/pdf-storage-r2.md](architecture/pdf-storage-r2.md) | PDF persistence in Cloudflare R2 (approved plan, not yet implemented) |
| [architecture/schema-driven-forms.md](architecture/schema-driven-forms.md) | How dynamic forms work (FormDefinition + SignatureTemplate) |
| [architecture/b2b-integration.md](architecture/b2b-integration.md) | API key auth, outbound webhooks, B2B integration design |
| [architecture/pending.md](architecture/pending.md) | Architectural items pending implementation |
| [development/local.md](development/local.md) | Local development setup, ports, database, BoldSign webhooks |
| [deployment/production.md](deployment/production.md) | Production deploy guide, Oracle Cloud, nginx, SSL, pm2 |
| [deployment/staging.md](deployment/staging.md) | Staging environment setup and deploy process |
| [deployment/backups.md](deployment/backups.md) | Prod DB backup → R2, restore procedure, retention, staging |
| [deployment/github-actions.md](deployment/github-actions.md) | CI/CD pipeline setup, GitHub Actions, environment secrets |

---

## Product Docs

| File | Description |
|---|---|
| [product/saas-overview.md](product/saas-overview.md) | Product vision, modules, document lifecycle, roles |
| [product/roadmap.md](product/roadmap.md) | Feature roadmap by phase |
| [product/subscription-model.md](product/subscription-model.md) | Plans, pricing tiers, add-ons, feature matrix |
| [product/pricing-and-services.md](product/pricing-and-services.md) | Public-facing pricing and service packages |
| [product/pricing-client-onepager.md](product/pricing-client-onepager.md) | One-pager for client-facing pricing conversations |
| [product/pricing-internal-strategy.md](product/pricing-internal-strategy.md) | Internal pricing strategy and rationale |

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

## PDF Export

To export all documentation as PDF:

```bash
# Requires Node.js (md-to-pdf installed globally)
npm install -g md-to-pdf

# Export all docs
bash docs/export-pdf.sh
```

PDF files are written to `docs/pdf/`, mirroring the folder structure.

---

_Maintained by NoaTechSolutions. Last updated: 2026-06-08._
