# NTSsign SaaS Overview

## What NTSsign is

NTSsign is a SaaS platform for creating, managing, sending, and tracking business documents such as contracts and similar agreement workflows.

The current product is focused on:

- document generation from internal forms
- BoldSign-based sending and signing
- signed PDF access
- customer/workspace management
- profile and company data management
- master-level administration

## Main modules

### Login

- branded login page
- create-account request flow
- input validation
- account-request storage for later review by master users

### Documents

- document listing
- filters, search, pagination, sort
- document creation wizard
- send for signature
- sync status
- final PDF view and download

### Profile

- company details
- insurance details
- primary contact
- editable profile cards
- collapsible sections
- company logo upload

### Users

Available for master users.

- user management
- create user
- edit user
- deactivate/reactivate user
- account request review

### Billing

- usage summary
- plan visibility
- workspace usage tracking

## Document creation flow

Document forms are **schema-driven** — each client sees a personalized popup with exactly the fields defined in their `FormDefinition.schemaJson`. No hardcoded fields.

### How it works

1. Client clicks "Create Document"
2. System reads the client's `UserDocumentConfig` for that document type
3. Loads the `FormDefinition.schemaJson` for their assigned form
4. Renders the dynamic form with the exact fields defined in the schema
5. On submit: document is created, BoldSign template is pre-filled via `fieldMappingJson`, sent to recipient for signing

### Field types supported

`text`, `email`, `phone`, `date`, `currency`, `number`, `textarea`, `select`

### Multi-template support per client

Each client can have multiple document type configurations:
- Contract → their own form + their own BoldSign template
- Invoice → different form + different template
- Proforma → etc.

All managed via `UserDocumentConfig` assignments.

### Admin configuration (MASTER user)

The MASTER user manages all form schemas and template assignments without touching code:
- Create/edit `FormDefinition` schemas (JSON field definitions)
- Create/edit `SignatureTemplate` entries (BoldSign templateId + field mapping)
- Assign configurations to specific clients via `UserDocumentConfig`

See [schema-driven-forms.md](../architecture/schema-driven-forms.md) for full technical spec.

## Roles

### Master

Master users can:

- manage workspace users
- review account requests
- view workspace-wide documents
- access broader administrative actions

### User

Standard users can:

- manage their own document flow
- update profile/workspace information
- work within the assigned workspace

## Current document lifecycle

The current workflow supports:

- draft creation
- send to BoldSign
- automatic status sync through callbacks
- signed/final PDF access

Statuses currently used include:

- DRAFT
- SENT
- VIEWED
- SIGNED
- COMPLETED
- CANCELLED

## BoldSign integration

The current implementation supports:

- template-based document creation
- send to recipient
- callback-based status synchronization
- final PDF retrieval

For local development:

- automatic status changes require a public `https://` callback URL
- local callback testing needs a tunnel such as `ngrok`

For staging:

- webhook-based automatic updates are expected

## Account request flow

The current login page includes a create-account request flow.

Captured fields:

- full name
- email
- confirm email
- requested document types

The request is stored in the database and can later be reviewed by master users.

## Product strengths today

- polished login and onboarding experience
- guided document creation workflow
- role-based workspace behavior
- team user management for master users
- account request intake and review
- billing and usage visibility
- signed PDF preview and download
- callback-based status automation
- customer-ready demo flow

## Product roadmap

### Phase A — CRM core (foundation for everything else)

**NOA-40 — Customer Management**
CRM-lite built into the workspace. Save clients (name, email, company, phone, address) and pre-fill document fields when creating a new document. Includes per-client document history. This is the highest-leverage feature — it enables Templates, Bulk Send, and Reminders naturally.

**NOA-41 — Document Templates**
Save reusable document templates (NDA, service agreement, invoice). Linked to a BoldSign template ID. Combined with Customer Management, the full creation flow becomes: pick template → pick client → send. Three clicks.

**NOA-42 — Automatic Signing Reminders**
Daily cron job that detects documents stuck in SENT/VIEWED for more than N days and sends a reminder via BoldSign's reminder API. Configurable per workspace (frequency, max attempts). Eliminates manual follow-up entirely.

### Phase B — Scale and differentiation

**NOA-43 — Bulk Send**
Send the same document to multiple clients in one operation. Each recipient gets their own personalized copy. Critical for annual renewals, onboarding campaigns, and mass NDA signing. Depends on NOA-40 + NOA-41.

**NOA-44 — Multi-signer workflows**
Support for documents requiring more than one signer, with configurable signing order (sequential or parallel). BoldSign already supports this natively — it's a matter of exposing it in the creation wizard and tracking per-signer status.

**NOA-39 — Public landing page**
Public-facing marketing site for NTSsign. Value proposition, feature highlights, brand colors, dark/light mode, fully responsive.

### Phase C — Advanced experience

**NOA-34 — White-label signing portal**
Let each workspace customize the signing experience with their own logo, colors, and optionally a custom domain. Premium tier feature.

**NOA-45 — Document folders/projects**
Group documents into folders or projects. Becomes more powerful when combined with Customer Management (auto-folder per client).

**NOA-36 — Analytics dashboard per tenant**
Richer reporting: documents sent/signed, average time to sign, bottlenecks, team performance.

**NOA-35 — Native email notifications**
Internal email reminders (expiration warnings, owner alerts) outside of BoldSign's email flow.

**NOA-37 — Bulk PDF export**
ZIP download of all signed PDFs for a given period. Useful for audits and compliance.

## Operational guidance

- continue building in local first
- validate integrations in staging
- push to production only after pricing, workflow, and support model are stable
