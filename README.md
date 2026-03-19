# NoaSign

NoaSign is a multi-tenant SaaS platform for document operations, contracts, templates, electronic signatures, workflows, and usage-based billing.

The product is being designed as a sustainable core platform that can support multiple industries without rewriting the foundation. The first practical use case is construction, with future expansion in mind for daycare, artists, service businesses, and other verticals.

## Platform Vision

NoaSign is intended to operate as a professional business system, not only as a document editor. The platform should support document creation, business workflows, external signature integrations, operational control, and billing visibility inside a single product.

## Project Principles

- Real multi-tenant architecture
- Maintainability
- Scalability
- Roles and permissions
- Templates by industry
- Decoupled integrations

## Repository Structure

```text
noasign/
  .github/
  apps/
    backend/
    frontend/
  packages/
  docs/
    product/
    architecture/
    api/
  infra/
```

## Current Status

This repository is in the foundation stage.

The current focus is to establish a clean monorepo structure, align documentation, and prepare the project for backend and frontend work without introducing unnecessary boilerplate or premature complexity.

An early backend workspace exists under `apps/backend`, while the repository structure is being organized to support future growth in a more consistent way.
