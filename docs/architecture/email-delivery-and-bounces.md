# Email delivery & bounce detection (Resend)

All transactional email in NTSsign is sent through **Resend** — signing
invitations, receipts, password resets, account notices, contact form. This doc
covers how send outcomes are tracked honestly, including **asynchronous bounce
detection** via Resend webhooks.

Code: `apps/backend/src/email/email.service.ts`,
`apps/backend/src/documents/` (service + `resend-webhook.controller.ts`),
`apps/backend/src/receipts/`.

---

## Why this exists

Resend accepts a send **synchronously** (returns an id, the message looks SENT),
but a hard bounce (nonexistent mailbox, etc.) arrives **minutes later** as an
asynchronous webhook. Without handling that, a document sent to a bad address
stays falsely `SENT`.

Two phases solve this:

- **FASE 1 — synchronous failures.** If `resend.emails.send()` rejects (or Resend
  is unconfigured), the document is marked `SEND_FAILED` with a human-readable
  `sendError` instead of a phantom `SENT`. (Receipts only — see the gap note.)
- **FASE 2 — asynchronous bounces.** A Resend webhook flips the document to
  `SEND_FAILED` when a **permanent** bounce arrives. Covers **receipts AND
  contracts**.

The UI renders `SEND_FAILED` as a chip + the `sendError` reason + a resend
action.

---

## The `Document` send-state fields

| Field | Meaning |
|-------|---------|
| `status = SEND_FAILED` | a `DocumentStatus` enum value (no new state was added) |
| `sendError` | human-readable reason (`"Bounced: <message>"` for bounces) |
| `providerEmailId` | Resend message id of the last send — the correlation key for bounces. Indexed (`@@index([providerEmailId])`). |

---

## How the invitation email is sent (important)

- **Receipts (DIRECT_PDF):** `EmailService.sendReceipt()` → Resend; returns
  `{ id }`, stored as `providerEmailId`.
- **Contracts (BoldSign):** the signing **invitation** is sent by **us via
  Resend** (`EmailService.sendSigningInvitation()`), NOT by BoldSign — BoldSign
  is created with `DisableEmails: true` (`boldsign.service.ts`). So the bounce
  webhook covers contracts identically. `sendSigningInvitation()` returns
  `{ id }`, captured into `providerEmailId` on contract send.

---

## FASE 2 — the bounce webhook

```
Resend ──(email.bounced, Svix-signed)──▶ POST /webhooks/resend
   └─ ResendWebhookController (public, no JWT — the Svix signature IS the auth)
        └─ EmailService.verifyResendWebhook(rawBody, svix headers)  → event | null
             └─ DocumentsService.handleResendWebhook(event)
                  ├─ email.bounced + bounce.type == "Permanent"
                  │     → findFirst({ providerEmailId }) → SEND_FAILED + "Bounced: <msg>"
                  ├─ email.bounced + Transient → ignored (Resend retries)
                  ├─ email.complained → soft-logged (reputation; no status change)
                  └─ anything else / no match → 200 no-op
```

Key points:

- **Signature:** `resend.webhooks.verify({ payload, headers, webhookSecret })` —
  Svix under the hood, **synchronous**, **throws** on a bad signature. No new
  dependency (`svix` is transitive via `resend`). `headers` is a plain
  `{ id, timestamp, signature }` object (the raw `svix-*` header values), **not**
  the Web `Headers` class.
- **rawBody** is available because `main.ts` enables `rawBody: true` globally.
- **No secret set ⇒ 403.** `verifyResendWebhook` returns `null` (→
  `ForbiddenException`) when `RESEND_WEBHOOK_SECRET` is missing or the signature
  fails. This is the expected state until the env var is configured per
  environment.
- **Only PERMANENT bounces** are terminal. Transient (soft) bounces are retried
  by Resend and ignored.
- **Cross-talk is benign:** a foreign `email_id` (e.g. from another env sharing
  the Resend account) simply matches no row → no-op.

---

## Per-environment configuration

`RESEND_WEBHOOK_SECRET` is the **per-endpoint** Svix secret (`whsec_…`). It lives
in the backend `.env` of each environment (manual — **not** GitHub Secrets, like
all backend secrets). Each environment gets its **own separate** Resend webhook
endpoint — never repoint one across envs.

| Env | Resend webhook endpoint URL | Secret location |
|-----|------------------------------|-----------------|
| Local | `https://<tunnel>.trycloudflare.com/webhooks/resend` (cloudflared quick tunnel → `localhost:3000`; URL is ephemeral) | local `apps/backend/.env` |
| Staging | `https://api-staging.ntssign.com/webhooks/resend` | staging VM `~/apps/ntssign/apps/backend/.env` |
| Prod | `https://api.ntssign.com/webhooks/resend` | prod VM `~/apps/ntssign/apps/backend/.env` |

Subscribe events: **`email.bounced`** (required) + **`email.complained`**
(optional). After editing the VM `.env`: `pm2 reload ntssign-backend --update-env`.

> The Resend account is shared across staging & prod (single `ntssign-production`
> token). That's fine — endpoints are per-URL with per-endpoint secrets, and
> foreign-id events are no-ops.

---

## Local tunnel (for testing webhooks locally)

ngrok is referenced in older docs, but the dev machine uses **cloudflared**
(quick tunnels are anonymous, no account):

```bash
"C:\Program Files (x86)\cloudflared\cloudflared" tunnel --url http://localhost:3000
```

Register the printed `https://<id>.trycloudflare.com/webhooks/resend` as a **new**
Resend endpoint (never the prod/staging one). The URL changes on every restart.

---

## E2E test scripts

`apps/backend/scripts/` — both send to Resend's bounce simulator
`bounced@resend.dev` and poll until the document flips to `SEND_FAILED`:

```bash
# Receipt path (works against any env — no hardcoded fixture)
BASE_URL=https://api-staging.ntssign.com EMAIL=… PASSWORD=… \
  node scripts/test-bounce-receipt.mjs

# Contract path (fixture IDs are LOCAL jane/World-Pavers — override for other envs)
node scripts/test-bounce-contract.mjs
```

Verified e2e: **local** (receipt + contract) and **staging** (receipt). The flip
to `SEND_FAILED` is itself proof the webhook was received, signature-verified, and
matched.

---

## Known gap (out of FASE 2 scope)

For **contracts**, a *synchronous* Resend send failure is currently swallowed
(non-fatal — the doc already exists in BoldSign and stays `SENT`). FASE 2 only
covers the *asynchronous* bounce. Receipts flip on sync failure (FASE 1);
contracts do not yet. Tracked as a future hardening item.
