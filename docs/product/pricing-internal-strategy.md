# NTSsign Internal Pricing Strategy

## Objective

The pricing model must:

- protect margin
- keep entry accessible for small contractors and service businesses
- avoid unlimited risk while running on BoldSign Enterprise API
- charge separately for setup and template work
- create room for future upsell based on workflow value, not just signature count

## Current business context

Current realities:

- provider capacity is limited
- the product already delivers more than just signature
- setup and adaptation work has real labor cost
- higher-value plans should be tied to workflow features, not only volume

This means:

- the public offer must stay conservative
- higher tiers should unlock more operational value
- roadmap features can help justify future upgrades

## Revenue model

Use three revenue layers:

### 1. Subscription

Public plans:

| Plan | Monthly | Annual (billed yearly) |
|---|---|---|
| Starter | $19/mo | $16/mo ($192/yr) |
| Launch ⭐ | $39/mo | $32/mo ($384/yr) |
| Pro | $89/mo | $74/mo ($888/yr) |
| Scale | $229/mo | $190/mo ($2,280/yr) |

### 2. Usage overage

| Plan | Overage per extra document |
|---|---|
| Starter | $4.00 |
| Launch | $3.50 |
| Pro | $2.50 |
| Scale | $1.50 |

### 3. Setup and implementation

| Service | Price |
|---|---|
| Template setup (basic) | $49 |
| Template setup + modifications | $79 |
| Express +48h | +$29 |
| Extra template slot (Starter/Launch) | $49 |
| Extra template slot (Pro) | $39 |
| Basic onboarding (2–3 people) | $149 |
| Full team onboarding | $249 |

## Product packaging logic

The plans should scale by business maturity:

### Starter

Good for:

- one operator
- one template
- one main workflow

Do not include:

- team features
- multi-signer

### Launch

Good for:

- small teams (2 users)
- multiple templates (up to 3)
- recurring document volume

**This is the default sales target for qualified customers.**

This is the first tier where we unlock:

- team and user management
- multi-signer / sequential signing

### Pro

Good for:

- growing businesses that need branding and reporting
- teams sending 15–50 documents per month

Unlocks:

- custom branding on documents
- analytics and reporting
- bulk send
- SMS OTP signer verification
- downloadable audit trail PDF

### Scale

Good for:

- high-volume teams (150 docs/mo)
- operations that need priority support and unlimited templates

Unlocks:

- unlimited templates
- priority support
- bulk ZIP PDF export
- Roadmap: white-label signing portal

## Pay-per-contract role

Use when:

- the customer signs only a few documents per month
- the customer resists monthly commitment
- the customer is still evaluating the service

Price: `$12` per document

Includes only the core signature workflow:

- document creation
- send for signature
- signed PDF
- audit trail
- 90-day document history

Does not include:

- setup work
- dashboard or team features

Break-even: 3+ documents/month → subscription is better value for the customer.

## Founder pricing guardrails

Founder pricing should be temporary and controlled.

Rules:

- use only for strategic early customers
- define document limits clearly
- define template limits clearly
- never give away subscription + setup + overage discounts all at once
- maximum: $29/month, cap 10 docs/mo, 1 template, no included setup

Safer founder example:

- `$29/month`
- up to `10` documents/month
- `1` template
- no included setup work

## Negotiation guardrails

Do not discount all of these together:

- monthly subscription
- setup fee
- overage pricing

Better options:

- waive part of setup, keep subscription
- founder price, but tight usage cap
- include first template, charge additional templates

Avoid:

- unlimited documents at low monthly price
- large template promises on lower-tier capacity
- selling roadmap items as if already shipped

## Roadmap-based upsells

These are good upgrade triggers once released:

- saved customer directory
- reusable customer records
- customer notes and history
- workflow reminders
- team approvals
- analytics and reporting
- white-label signing portal (Scale+)
- deeper onboarding services

## Core sales message

Internally, always anchor on this:

- NTSsign is not a commodity signature request
- NTSsign is a workflow layer that adapts to the client's way of operating
- the customer pays for speed, organization, setup, and control

## Recommended public offer

Publicly communicate:

- `Pay-per-contract`
- `Starter`
- `Launch` ← main sales target
- `Pro`
- `Scale`

Internally reserve:

- founder discounts
- custom volume quotes for very high usage
- roadmap-based premium upgrade paths

> **Important:** The B2B API channel (NTSolutions internal integrations) is exclusively for
> NTSolutions internal platforms. It is **not** part of the public NTSsign offer and should
> never be mentioned in customer-facing sales or marketing materials.
