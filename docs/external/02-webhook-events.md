# Webhook Events

> ⚠️ **Documento interno — NTSolutions only.**
> Esta guía es exclusivamente para integraciones internas de NTSolutions.
> No distribuir a clientes externos ni referenciar en materiales públicos.

NTSsign sends outbound webhooks to notify your system when document events occur in real time. This eliminates the need to poll the API for status changes.

---

## Registering a Webhook Endpoint

Contact **integrations@noatechsolutions.com** to register your endpoint. Provide:

- Your HTTPS endpoint URL
- The events you want to receive (see Event Catalog below)

Your endpoint must:
- Be publicly reachable via HTTPS
- Respond with HTTP `2xx` within 10 seconds

> Webhook self-registration via API is on the roadmap. For now, endpoint registration is done through the NTSsign team.

---

## Event Catalog

| Event | Fired when |
|---|---|
| `document.created` | A draft document is created |
| `document.sent` | A document is sent to the recipient for signing |
| `document.viewed` | The recipient opens the signing link |
| `document.signed` | The recipient completes the signature |
| `document.completed` | All parties have signed — document is complete |
| `document.cancelled` | A document is cancelled before completion |

---

## Payload Format

All events share the same envelope structure:

```json
{
  "event": "document.completed",
  "timestamp": "2026-04-10T14:30:00Z",
  "tenantId": "cmp_abc123",
  "data": {
    "documentId": "doc_xyz789",
    "documentNumber": "INS-2026-001",
    "status": "COMPLETED",
    "completedAt": "2026-04-10T14:30:00Z"
  }
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `event` | string | Event type from the catalog above |
| `timestamp` | ISO 8601 | When the event was fired (UTC) |
| `tenantId` | string | Your tenant identifier on NTSsign |
| `data.documentId` | string | Internal NTSsign document ID |
| `data.documentNumber` | string | Human-readable document number (e.g. `INS-2026-001`) |
| `data.status` | string | Current document status |
| `data.completedAt` | ISO 8601 | Present only on `document.completed` events |

---

## Verifying the Signature

Every webhook delivery includes a signature header so you can verify it came from NTSsign and was not tampered with.

### Headers

```
X-NTSsign-Signature: sha256=<hmac_hex>
X-NTSsign-Event: document.completed
X-NTSsign-Delivery: <uuid>
```

### Verification (Node.js example)

```javascript
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)          // raw request body as Buffer or string
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

// In your Express route:
app.post('/webhooks/ntssign', express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.headers['x-ntssign-signature'];
  if (!verifyWebhook(req.body, sig, process.env.NTSSIGN_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  // handle event...

  res.status(200).send('OK');
});
```

> Always use `crypto.timingSafeEqual` for comparison — never `===`. This prevents timing attacks.

### Important

- Compute the HMAC over the **raw request body** — do not parse it as JSON first
- If the signature does not match, reject the request with `401`
- The `X-NTSsign-Delivery` UUID can be used to deduplicate retried deliveries

---

## Delivery and Retries

- NTSsign delivers the event and waits up to **10 seconds** for a `2xx` response
- If no `2xx` is received, the event is retried **once after 5 seconds**
- If the second attempt also fails, the event is dropped (Phase 1 behavior)
- Phase 2 will introduce persistent retry queues with exponential backoff

### Responding quickly

Your endpoint should return `200 OK` immediately after verifying the signature, then process the event asynchronously (queue it internally). This prevents timeouts from blocking delivery.

---

## Idempotency

Your handler should be idempotent — the same event may be delivered more than once (e.g. in the case of a retry). Use the `X-NTSsign-Delivery` UUID to deduplicate if needed.

---

## Testing Webhooks

During development, use a tunnel tool to expose your local server:

```bash
# ngrok
ngrok http 3000
```

Provide the HTTPS ngrok URL as your webhook endpoint during testing. The tunnel URL changes on every restart unless you have a paid ngrok plan.

---

## Example: Handling `document.completed`

```javascript
app.post('/webhooks/ntssign', express.raw({ type: '*/*' }), async (req, res) => {
  const sig = req.headers['x-ntssign-signature'];
  if (!verifyWebhook(req.body, sig, process.env.NTSSIGN_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Respond immediately
  res.status(200).send('OK');

  // Process asynchronously
  const event = JSON.parse(req.body);

  if (event.event === 'document.completed') {
    const { documentId, documentNumber } = event.data;
    await markContractSigned(documentId);
    await notifyAccountManager(documentNumber);
  }
});
```

---

## Support

For webhook configuration and troubleshooting, contact **integrations@noatechsolutions.com**.
