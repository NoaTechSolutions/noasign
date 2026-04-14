# NTSsign API Integration Guide

> ⚠️ **Documento interno — NTSolutions only.**
> Esta guía es exclusivamente para integraciones internas de NTSolutions.
> No distribuir a clientes externos ni referenciar en materiales públicos.

This guide is for NTSolutions internal SaaS platforms that integrate with NTSsign programmatically to create, send, and track documents on behalf of their users.

---

## Overview

NTSsign exposes a REST API at `https://api.ntssign.com`. All endpoints are versioned under `/v1/`.

The integration model is **platform-as-a-service**: your SaaS authenticates as a tenant, creates and manages documents on behalf of your users, and receives real-time status updates via outbound webhooks.

```
Your SaaS                              NTSsign
┌──────────────────────┐              ┌──────────────────────────┐
│  Your customers      │              │  Tenant (your account)   │
│  Your auth           │──API Key────▶│  Documents               │
│  Your UI             │◀──Webhook────│  Billing (per document)  │
└──────────────────────┘              └──────────────────────────┘
```

---

## Authentication

External integrations authenticate using **API Keys**.

### Obtaining an API Key

API Keys are issued by the NTSsign team during onboarding. Contact us at **integrations@noatechsolutions.com** to request access.

Once issued, a key looks like:

```
ntssign_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0
```

The key is shown only once at creation. Store it securely — it cannot be retrieved again.

### Using the API Key

Include the key in every request as an HTTP header:

```http
X-API-Key: ntssign_<your_key>
```

Alternatively, in the Authorization header:

```http
Authorization: Bearer ntssign_<your_key>
```

The `ntssign_` prefix is required — it distinguishes API keys from user JWTs at the authentication layer.

---

## Base URL

```
https://api.ntssign.com/v1
```

All endpoints below are relative to this base URL.

---

## API Versioning

All routes are prefixed with `/v1/`. The version is in the URL path, not in headers, for maximum compatibility with proxies and HTTP clients.

When breaking changes are required, `/v2/` routes are added alongside `/v1/` with a documented deprecation window. Existing routes are never removed without a migration path.

---

## Core Endpoints

### Documents

| Method | Path | Description |
|---|---|---|
| `POST` | `/documents/draft` | Create a draft document |
| `GET` | `/documents` | List documents (paginated, filterable) |
| `GET` | `/documents/:id` | Get document details |
| `POST` | `/documents/:id/send` | Send a draft for signature |
| `POST` | `/documents/:id/cancel` | Cancel a sent document |
| `GET` | `/documents/:id/final-pdf` | Download the signed PDF (Completed only) |

### Billing

| Method | Path | Description |
|---|---|---|
| `GET` | `/billing/current-usage` | Current month usage and plan limits |

---

## Creating a Document

```http
POST /v1/documents/draft
X-API-Key: ntssign_<your_key>
Content-Type: application/json

{
  "documentTypeCode": "CONSTRUCTION_CONTRACT",
  "formData": {
    "customer_name": "John Smith",
    "customer_email": "john.smith@example.com",
    "customer_phone": "(555) 123-4567",
    "customer_address": "123 Main St",
    "city": "Houston",
    "state": "TX",
    "zip": "77001",
    "project_address": "456 Oak Ave",
    "project_city": "Houston",
    "project_state": "TX",
    "project_zip": "77002",
    "start_date": "2026-05-01",
    "contract_amount": "15000.00",
    "down_payment_amount": "3000.00"
  }
}
```

**Response:**

```json
{
  "id": "doc_cuid123",
  "documentNumber": "INS-2026-001",
  "status": "DRAFT",
  "createdAt": "2026-04-10T12:00:00Z"
}
```

---

## Sending a Document

```http
POST /v1/documents/doc_cuid123/send
X-API-Key: ntssign_<your_key>
```

This triggers the BoldSign signing flow. The recipient receives an email with a secure signing link.

**Response:**

```json
{
  "id": "doc_cuid123",
  "status": "SENT",
  "sentAt": "2026-04-10T12:01:00Z"
}
```

---

## Polling vs. Webhooks

You can check document status by polling `GET /v1/documents/:id`, but **webhooks are strongly recommended** for production integrations. They provide real-time updates without wasting API quota.

See [Webhook Events →](02-webhook-events.md) for setup and event reference.

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "customer_email is required",
  "error": "Bad Request"
}
```

| Status Code | Meaning |
|---|---|
| `400` | Validation error — check `message` for field details |
| `401` | Missing or invalid API key |
| `403` | API key valid but insufficient permissions |
| `404` | Document not found (or not owned by your tenant) |
| `429` | Rate limit exceeded — back off and retry |
| `500` | Internal error — contact support if persistent |

---

## Rate Limits

API key requests are rate-limited per tenant:

| Plan | Requests / minute |
|---|---|
| Launch | 60 |
| Scale | 300 |
| Enterprise | 1000 |

When you exceed the limit, the API returns `429 Too Many Requests`. Include a `Retry-After` header wait before retrying.

---

## OpenAPI / Swagger

A full interactive API reference is available at:

```
https://api.ntssign.com/v1/docs
```

Available in staging and by request for production integration testing.

---

## Support

For integration support, contact **integrations@noatechsolutions.com**.

Include your tenant name and the endpoint you're integrating with for faster resolution.
