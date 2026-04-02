# NTSsign

NTSsign is a multi-tenant SaaS platform for document operations, contracts, electronic signatures, workflows, and usage-based billing.

Built for construction businesses first, with a foundation designed to expand to other industries without rewriting the core.

## Platform Vision

NTSsign operates as a professional business system — not just a document editor. The platform covers document creation, guided workflows, external signature integrations (BoldSign), operational control, and billing visibility inside a single product.

## Project Principles

- Real multi-tenant architecture
- Maintainability and scalability
- Roles and permissions (MASTER / USER)
- Templates by industry
- Decoupled integrations

## Repository Structure

```text
ntssign/
  .github/
    workflows/       # CI and deploy pipelines
  apps/
    backend/         # NestJS API
    frontend/        # Next.js app
  docs/
    architecture/    # Architecture overview, B2B integration design, pending work
    development/     # Local setup guide
    deployment/      # Production and staging guides
    product/         # Product overview and pricing
  infra/
    docker-compose.local.yml   # Local PostgreSQL
```

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 + TypeScript + Prisma 6 |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| Signatures | BoldSign |
| Hosting | Oracle Cloud VM + Cloudflare DNS |
| Process manager | pm2 |
| Reverse proxy | nginx |

## Environments

| Environment | Purpose |
|---|---|
| `local` | Active development on your machine |
| `production` | Live customers on Oracle Cloud |

## Quick Start (local)

See [docs/development/local.md](docs/development/local.md) for the full setup guide.

```bash
# 1. Start local database
docker compose -f infra/docker-compose.local.yml up -d

# 2. Copy env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# 3. Install and migrate
cd apps/backend && npm install && npx prisma migrate deploy && npm run bootstrap:local

# 4. Start apps (two terminals)
npm run start:dev          # backend on :3000
cd ../frontend && npm run dev  # frontend on :3001
```

## Platform Integration (B2B)

NTSsign is designed to be consumed by external SaaS platforms via API. External systems authenticate using **API Keys** and receive real-time document events via **outbound webhooks**.

This enables other NTSolutions products to delegate document signing to NTSsign without building their own signature infrastructure.

See [docs/architecture/b2b-integration.md](docs/architecture/b2b-integration.md) for the full integration design.

## Current Status

The core product is feature-complete and preparing for production launch.

**Implemented:**
- Multi-tenant document lifecycle (DRAFT → SENT → VIEWED → SIGNED → COMPLETED → CANCELLED)
- BoldSign integration with webhook callbacks
- Guided document creation wizard (client, project, pricing tabs)
- Usage-based billing tracking with overage support
- User management with MASTER / USER roles
- Company profile management
- Account request intake and review flow
- Password reset flow
- Signed PDF preview and download
- CI pipeline (tests + lint) and deploy pipeline (SSH to Oracle VM)

**B2B API (in progress):**
- API versioning (`/v1/`)
- API Keys for machine-to-machine auth
- OpenAPI/Swagger documentation
- Outbound webhooks for document events

**Product roadmap:**
- Saved customer directory
- Reminder automations
- Deeper white-labeling
- More document types and industries

See [docs/architecture/pending.md](docs/architecture/pending.md) for the full pending work list.
