# NoaSign — Product Roadmap

_Last updated: 2026-04-06_

Items marked **[SCHEMA]** require Prisma schema changes before implementation.

---

## Epic NOA-46 — Schema-Driven Document Forms (Current Sprint)

**Priority:** Blocking — must ship before Phase 1 features  
**Type:** Epic / Architecture

The current document creation form is hardcoded in the frontend. Every new client with different fields requires a code change and deployment. This epic replaces that with a fully dynamic system.

**Core change:** `FormDefinition` gains a `schemaJson` field. The frontend renders forms dynamically from this schema. No code changes needed to onboard new clients.

**Scenarios covered:**
- Client brings their own PDF → upload to BoldSign, map fields, define schema in NoaSign
- Client has no document → use a BoldSign template, same setup flow

**Multi-template per client:** Each client can have Contract, Invoice, Proforma, etc. — each with its own form and BoldSign template, all managed via `UserDocumentConfig`.

**Admin workflow:** MASTER user manages all schemas, templates, and assignments via an in-app admin panel — no deployments.

**Child issues:** NOA-47 (migration) → NOA-48 (API) → NOA-49/50/51 (admin endpoints) → NOA-52 (dynamic renderer) → NOA-53/54/55 (admin UI)

See [schema-driven-forms.md](../architecture/schema-driven-forms.md) for full technical spec.

---

## Phase 1 — MVP Completion (Current Sprint)

These are blockers. The product is incomplete without them.

### P1-01 · Multi-signer / Sequential Signing **[SCHEMA]**
**Priority:** Critical  
**Type:** Feature

Contracts frequently require 2+ signatures (client + agent, spouses, partners, guarantors).

**Flow:**
1. Sender defines signer order when creating the document
2. Signer 1 receives the document → signs
3. Signer 2 receives notification → signs
4. Document marked COMPLETED when all parties have signed

**Schema additions:**
- `DocumentSigner` table: `documentId`, `signerEmail`, `signerName`, `order`, `status`, `signedAt`, `token`
- `Document.signerCount: Int`
- `Document.signersCompleted: Int`

**BoldSign support:** BoldSign supports multi-signer natively — map existing template fields to signer roles.

---

### P1-02 · Automatic Reminders **[SCHEMA]**
**Priority:** Critical  
**Type:** Feature

The biggest drop-off in document signing is the signer not responding. Automated reminders solve this without manual work from the sender.

**Logic:**
- Reminder 1: 24 hours after sending if not signed
- Reminder 2: 3 days after sending if not signed
- Manual reminder: sender can trigger at any time (already partially implemented)
- Configurable per document or per workspace settings

**Schema additions:**
- `Document.reminderSentCount: Int @default(0)`
- `Document.lastAutoReminderAt: DateTime?`
- `WorkspaceSettings.autoReminderEnabled: Boolean @default(true)`
- `WorkspaceSettings.reminderIntervalHours: Int @default(24)`

**Implementation:** background job (cron) that scans `SENT` documents and triggers reminders via BoldSign API.

---

### P1-03 · Document Expiration **[SCHEMA]**
**Priority:** Critical  
**Type:** Feature

Documents that are not signed within a defined window should auto-cancel. Critical for insurance offers, proposals, time-sensitive contracts.

**Logic:**
- Sender sets expiration when creating document (default: 7 days, configurable)
- If not signed by expiry → document auto-cancels
- Sender and signer receive expiration notification
- Expired documents cannot be reactivated (must create new)

**Schema additions:**
- `Document.expiresAt: DateTime?`
- `Document.expiredAt: DateTime?`

**Implementation:** background job (cron) scans `SENT`/`VIEWED` documents past `expiresAt` and marks them `CANCELLED`.

---

### P1-04 · Decline to Sign **[SCHEMA]**
**Priority:** Critical  
**Type:** Feature

Signers must be able to decline a document with a reason. Without this, the sender has no visibility into why a document remains unsigned.

**Flow:**
1. Signer opens the document
2. Clicks "Decline to sign"
3. Required: enters reason (free text)
4. Document status → `DECLINED`
5. Sender receives email notification with the reason

**Schema additions:**
- `DocumentStatus` enum: add `DECLINED`
- `Document.declinedAt: DateTime?`
- `Document.declineReason: String?`

**BoldSign:** Map to BoldSign's decline webhook event.

---

### P1-05 · Pay-per-contract User Flow **[SCHEMA]**
**Priority:** High  
**Type:** Feature

Users who don't want a monthly subscription can purchase individual contract credits.

**Flow:** Register → buy credit ($12 via Stripe) → create + send 1 doc → track + download → 90-day history.

**Schema additions:**
- `PlanName` enum: add `PAY_PER_CONTRACT`
- `CompanyProfile.contractCredits: Int @default(0)`
- `ContractCreditPurchase` table: `userId`, `amountCents`, `credits`, `stripePaymentIntentId`, `createdAt`

**Business rule:** Sending a document deducts 1 credit. Zero credits = cannot send.

---

### P1-06 · Document Retention & Expiry by Plan **[SCHEMA]**
**Priority:** High  
**Type:** Feature

Documents are retained for a plan-defined period, then notified and deleted.

**Retention by plan:**
- PAY_PER_CONTRACT: 90 days
- Starter: 1 year
- Launch: 2 years
- Pro: 3 years
- Scale: 5 years
- Enterprise: Unlimited

**Schema additions:**
- `Document.storageExpiresAt: DateTime?` (set on creation based on plan)
- `Document.storageExpiryNotifiedAt: DateTime?`

**Implementation:** cron job notifies 30 days before expiry; deletes files + record on expiry date.

---

### P1-07 · Viral Loop — "Sent with NoaSign" Branding
**Priority:** High  
**Type:** Growth / Feature

Every document sent to a signer includes subtle NoaSign branding in the signing email and signing page footer. Clicking it leads to the marketing landing page.

**White-label:** Enterprise plan can disable this branding entirely.

**Implementation:** Add branded footer to outgoing BoldSign emails via template customization. No schema change required.

---

## Phase 2 — Competitive Differentiation

### P2-01 · Audit Trail PDF (Downloadable)
**Priority:** High  
**Type:** Feature — Pro+

A separate PDF documenting: who signed, from what IP, at what time, on what device, with what verification method. Required for some contract types legally.

**Available on:** Pro, Scale, Enterprise.

---

### P2-02 · SMS OTP Signer Verification
**Priority:** Medium  
**Type:** Feature — Pro+

Before the signer can access the document, they receive an SMS with a one-time code. Adds legal weight to the signature.

**Schema additions:**
- `DocumentSigner.phoneNumber: String?`
- `DocumentSigner.otpVerifiedAt: DateTime?`

---

### P2-03 · Granular Team Roles **[SCHEMA]**
**Priority:** Medium  
**Type:** Feature — Scale+

Current: `MASTER / ADMIN / USER`  
Target:
- **Owner**: billing + global settings
- **Admin**: create users and templates
- **Agent**: create and send documents
- **Viewer**: read-only access, no sending

**Schema change:** Expand `UserRole` enum.

---

### P2-04 · Team Activity Log **[SCHEMA]**
**Priority:** Medium  
**Type:** Feature — Scale+

Full audit of who did what and when within the workspace. "Agent X sent contract #1234 on Monday at 3pm." Required for compliance and enterprise accountability.

**Schema additions:**
- `ActivityLog` table: `workspaceId`, `userId`, `action`, `resourceType`, `resourceId`, `metadata: Json`, `createdAt`

---

### P2-05 · Referral Program **[SCHEMA]**
**Priority:** Medium  
**Type:** Growth

Refer a business → they subscribe → referrer gets 1 month free.

**Schema additions:**
- `Referral` table: `referrerId`, `referredEmail`, `referredUserId?`, `rewardGrantedAt?`, `createdAt`

---

### P2-06 · Template Marketplace
**Priority:** Medium  
**Type:** Feature + Revenue

Pre-built templates for common use cases (NDA, service agreement, construction contract, etc.). Some free, some paid ($9–19 one-time). Revenue share if third parties contribute.

**Schema additions:**
- `MarketplaceTemplate` table: `name`, `description`, `category`, `priceUsd`, `isActive`, `downloadCount`

---

### P2-07 · Bulk Send
**Priority:** Medium  
**Type:** Feature — Pro+

Send the same document to multiple recipients at once. Each recipient gets their own individual copy. Useful for sending the same contract to a list of clients.

---

### P2-08 · Extended Retention Add-on **[SCHEMA]**
**Priority:** Low  
**Type:** Revenue

$5/mo per additional year of document retention beyond the plan default.

**Schema additions:**
- `AddOnSubscription` table: `companyProfileId`, `type: EXTENDED_RETENTION | TEMPLATE_SLOT | CONTRACT_CREDIT`, `quantity`, `priceUsd`, `activeUntil`

---

## Phase 3 — Growth & Enterprise

### P3-01 · Integrations (Zapier, Google Drive, HubSpot, Salesforce)
**Priority:** Medium  
**Type:** Feature — Scale+

- **Google Drive / Dropbox**: auto-save signed PDFs
- **HubSpot / Salesforce**: create document from a CRM deal
- **Zapier**: connect with any tool via no-code automation

---

### P3-02 · Public API + Webhooks
**Priority:** Medium  
**Type:** Feature — Scale+

Developers and agencies can embed NoaSign into their own applications. Full REST API with webhook events for document lifecycle changes.

---

### P3-03 · Payment at Signing (Stripe)
**Priority:** Low  
**Type:** Feature — Pro+

Client signs the contract AND pays the deposit in the same flow. High value for contractors, service businesses, insurance.

---

### P3-04 · In-Person Signing Mode
**Priority:** Low (pending legal validation)  
**Type:** Feature — Enterprise

Agent hands the tablet to the client who signs directly on screen. No email needed.

**Legal requirements:** wet signature vs electronic signature parity, biometric capture, photo/ID verification for high-value contracts. Research required before implementation.

---

### P3-05 · Own Signature Engine (replace BoldSign)
**Priority:** Low — Long-term strategic  
**Type:** Infrastructure

Full control over signing UX, branding, cost, and legal compliance. Eliminates per-document provider dependency.

**Blockers (must resolve before starting):**
- ESIGN Act (US) + UETA compliance validation
- eIDAS (EU) — SES / AES / QES classification
- Per-country regulations for target markets
- Legal review of tamper-evident seal (PDF/A, PKCS#7, timestamp authority)
- Identity verification standards (KBA, biometric, government ID scan)
- External legal counsel sign-off

_Do not start implementation until all legal blockers are cleared._

---

## Schema Changes Summary (all phases)

```prisma
// Phase 1
model DocumentSigner {
  id            String   @id @default(uuid())
  documentId    String
  signerEmail   String
  signerName    String?
  order         Int
  status        SignerStatus @default(PENDING)
  signedAt      DateTime?
  declinedAt    DateTime?
  declineReason String?
  token         String   @unique
  createdAt     DateTime @default(now())
}

enum SignerStatus { PENDING SENT VIEWED SIGNED DECLINED }

// Add to Document
expiresAt              DateTime?
expiredAt              DateTime?
declinedAt             DateTime?
declineReason          String?
reminderSentCount      Int      @default(0)
lastAutoReminderAt     DateTime?
storageExpiresAt       DateTime?
storageExpiryNotifiedAt DateTime?

// Add to CompanyProfile
contractCredits        Int      @default(0)
maxPagesPerDocument    Int      @default(10)
documentRetentionDays  Int      @default(365)

// Add to PlanName enum
PAY_PER_CONTRACT
STARTER
// (rename existing: LAUNCH stays, SCALE stays, add ENTERPRISE)

// New tables Phase 1
model ContractCreditPurchase { ... }
model WorkspaceSettings { ... }

// Phase 2
model ActivityLog { ... }
model Referral { ... }
model MarketplaceTemplate { ... }
model AddOnSubscription { ... }
```

---

## Linear Epics Mapping

When adding to Linear, use these as **Epics**:

| Epic | Phase | Label |
|------|-------|-------|
| Multi-signer & Document Lifecycle | 1 | `feature`, `critical` |
| Pay-per-contract & Billing | 1 | `feature`, `revenue` |
| Document Retention System | 1 | `feature`, `infrastructure` |
| Viral Loop & Growth Mechanics | 1–2 | `growth` |
| Team Roles & Activity Log | 2 | `feature`, `enterprise` |
| Template Marketplace | 2 | `feature`, `revenue` |
| Integrations & API | 3 | `feature`, `enterprise` |
| Own Signature Engine | 3 | `infrastructure`, `legal-blocked` |
