# NoaSign — Subscription Model

_Last updated: 2026-04-06_

---

## Plans

### Monthly / Annual billing

| Plan | Monthly | Annual (save ~17%) | Best for | Docs/mo | Users | Templates | Extra doc |
|------|---------|-------------------|----------|---------|-------|-----------|-----------|
| **Starter** | $19 | $16/mo | Solo operator, occasional use | 5 | 1 | 1 | $4.00 |
| **Launch** | $39 | $32/mo | Small agency getting started | 15 | 2 | 3 | $3.50 |
| **Pro** | $89 | $74/mo | Growing business, higher volume | 50 | 5 | 10 | $2.50 |
| **Scale** | $229 | $190/mo | High-volume teams | 150 | 15 | Unlimited | $1.50 |
| **Enterprise** | Custom | Custom | Large orgs, white-label, compliance | Unlimited | Unlimited | Unlimited | — |

### Pay-as-you-go

| Option | Price | Best for |
|--------|-------|----------|
| **Pay-per-contract** | $12/contract | Users who don't need a monthly subscription |

No subscription required. User creates an account, purchases contract credits individually.
Break-even: 3+ contracts/month → subscription is more cost-effective.

---

## Feature Matrix

| Feature | PAY_PER_CONTRACT | Starter | Launch | Pro | Scale | Enterprise |
|---------|-----------------|---------|--------|-----|-------|------------|
| Digital signature + audit trail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PDF download + certificate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Email notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Decline to sign | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Automatic reminders | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Document expiration | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| User management | — | — | ✓ | ✓ | ✓ | ✓ |
| Multi-signer / sequential signing | — | — | ✓ | ✓ | ✓ | ✓ |
| Custom branding on documents | — | — | — | ✓ | ✓ | ✓ |
| Bulk send | — | — | — | ✓ | ✓ | ✓ |
| Advanced analytics & reporting | — | — | — | ✓ | ✓ | ✓ |
| Audit trail PDF (downloadable) | — | — | — | ✓ | ✓ | ✓ |
| SMS OTP verification (signer) | — | — | — | ✓ | ✓ | ✓ |
| Priority support | — | — | — | — | ✓ | ✓ |
| API access + Webhooks | — | — | — | — | ✓ | ✓ |
| Activity log (team audit) | — | — | — | — | ✓ | ✓ |
| Granular roles (Owner/Admin/Agent/Viewer) | — | — | — | — | ✓ | ✓ |
| White-label (remove NoaSign branding) | — | — | — | — | — | ✓ |
| In-person signing mode | — | — | — | — | — | ✓ |
| HIPAA / compliance mode | — | — | — | — | — | ✓ |
| Dedicated account manager | — | — | — | — | — | ✓ |
| Custom integrations / SLA | — | — | — | — | — | ✓ |

---

## Document Limits

### Pages per document

| Plan | Max pages per document |
|------|----------------------|
| PAY_PER_CONTRACT | 10 pages |
| Starter | 10 pages |
| Launch | 15 pages |
| Pro | 30 pages |
| Scale | Unlimited |
| Enterprise | Unlimited |

_Rationale: controls provider cost (BoldSign / own signature engine) and differentiates tiers without blocking typical use cases (most contracts are 3–12 pages)._

### Document history / retention

| Plan | Retention | Notification before expiry |
|------|-----------|---------------------------|
| PAY_PER_CONTRACT | 90 days | 15 days before |
| Starter | 1 year | 30 days before |
| Launch | 2 years | 30 days before |
| Pro | 3 years | 30 days before |
| Scale | 5 years | 30 days before |
| Enterprise | Unlimited / custom | — |

- Users can always export a ZIP of their documents before expiry (free).
- Extended Retention add-on: $5/mo per additional year (for lower-tier plans).
- Expired documents are deleted after the retention period. Notification sent proactively.

---

## Add-ons & Professional Services

### Template add-on (extra template slots)

| Plan | Extra template price |
|------|---------------------|
| Starter | $19 one-time per slot |
| Launch | $15 one-time per slot |
| Pro | $12 one-time per slot |
| Scale | Included (Unlimited) |

### Template Setup Service (NoaTech builds it for you)

| Service | Price | Includes |
|---------|-------|----------|
| Template Setup | $49 one-time | Client sends their PDF, NoaTech maps signature fields and configures the template |
| Template Setup + Modifications | $79 one-time | Same + adjustments to the document (clauses, fields, format) |
| Express (48h delivery) | +$29 | Guaranteed 48-hour turnaround |

### Extended Retention

$5/mo per additional year of document retention (available for Starter, Launch, Pro).

---

## Pay-per-contract User Flow

1. User registers with email + password (permanent account, no credit card required at signup)
2. System assigns `PAY_PER_CONTRACT` plan — 0 credits
3. To send a document → purchases 1 credit ($12) → Stripe payment
4. Creates document, sends for signature, tracks status, downloads signed PDF
5. Account remains active. Zero credits = cannot send new documents
6. After 90 days → document record and files are deleted (with prior notification)
7. Upgrade path: one click to any monthly plan

---

## Commercial Rules Summary

```
Occasional use (1–2 contracts/month)    → Pay-per-contract $12/contract
3+ contracts/month                       → Starter $19/mo (better value)
Need team + user management              → Launch $39/mo
High volume + custom branding            → Pro $89/mo
Large team + API + compliance            → Scale $229/mo
White-label + enterprise SLA             → Enterprise (custom)

Want your own contract template added    → Template Setup Service $49
Need extra templates on current plan     → Template add-on ($12–19 one-time)
Need to keep docs longer than plan       → Extended Retention $5/mo/year
```

---

## Future: Own Signature Engine

Currently using BoldSign as the signature provider. Long-term goal is to build a proprietary signature engine to:
- Eliminate per-document provider costs
- Full control over signing UX and branding
- Enable in-person signing with ID/photo verification
- Comply with eSign laws (ESIGN Act, eIDAS, local regulations per country)

**Legal requirements to research before implementation:**
- ESIGN Act (US) and UETA compliance
- eIDAS (EU) — Simple, Advanced, Qualified Electronic Signatures
- Per-country regulations for target markets
- Identity verification standards (KBA, biometric, government ID)
- Audit trail legal requirements per jurisdiction
- Tamper-evident seal requirements (PDF/A, PKCS#7)

_This is a Phase 3 initiative. Do not implement until legal framework is fully validated._
