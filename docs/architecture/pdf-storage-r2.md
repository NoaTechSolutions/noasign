# PDF storage in Cloudflare R2 (plan)

**Status: IN PROGRESS (local).**
- ✅ Receipts: persisted to R2 on create + **streamed from R2** through the
  backend on read + lazy backfill + cache-invalidation on edit. **E2E verified
  local** (`scripts/test-r2-receipt.mjs`).
- ✅ Contracts: wired — eager cache on COMPLETED (best-effort) + lazy on-read in
  `streamFinalPdf` (streamed from R2, attachment). Not yet e2e-verified (needs a
  real BoldSign-COMPLETED doc; same R2Service round-trip is proven).
- ⬜ Staging/prod: owner creates `ntssign-docs-staging/-prod` buckets + creds.

> **Delivery = stream, NOT 302→presigned.** A 302 to a presigned R2 URL breaks
> the in-app PDF viewer: it blob-fetches the endpoint and follows the redirect to
> R2, but R2 sends no CORS headers, so the browser blocks reading the
> cross-origin body → blank PDF. The backend therefore downloads from R2 and
> streams the bytes same-origin (CORS already allows the app). The presigned-URL
> helper remains for a possible future direct-download-link feature (would need
> per-bucket R2 CORS config).

This is the design of record; keep it current as implementation lands.

Persist generated receipt PDFs and signed contract PDFs in **Cloudflare R2** for:
download from history, retention by plan, audit, and future features.

---

## How PDFs work today (baseline)

- **Receipts (DIRECT_PDF):** generated **on the fly** every time with `pdf-lib`
  from a base PDF + fonts on disk (`receipt-pdf.service.ts`). The emailed buffer
  is **not** persisted. `GET /documents/receipt/:id/pdf` regenerates and streams.
- **Contracts (BoldSign):** the signed PDF lives in BoldSign and is **downloaded
  on demand** from its API on every `GET /documents/:id/final-pdf` — no local
  copy.
- **No file storage exists** today. The schema already has a **dormant**
  `DocumentFile` model + `StorageProvider` enum (`BOLDSIGN | S3 | R2`) — designed
  for exactly this, zero current usage.
- **Tenant security is already enforced** before serving any PDF
  (`getDocumentAccessScope` for contracts, `loadReceiptForUser` for receipts).
  R2 reuses this exact gate.

---

## Approach

- **SDK:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 is
  S3-compatible). Wrapped in an `R2Service`.
- **Schema:** reuse the dormant `DocumentFile` (`provider = R2`,
  `storageUrl = object key`, `fileType`, `fileName`, `mimeType`). Possibly add one
  `DocumentFileType` value for generated receipts (today: `PREVIEW | SIGNED_PDF |
  ATTACHMENT`). Minimal migration.
- **Write path:**
  - Receipt → on create/send, upload the generated buffer →
    `receipts/{tenantId}/{documentId}.pdf` → `DocumentFile` row.
  - Contract → when it becomes `COMPLETED` (webhook sync, or lazy on first
    download), download the signed PDF from BoldSign **once** → upload →
    `signed/{tenantId}/{documentId}.pdf` → `DocumentFile` row. Future downloads
    serve from R2, not BoldSign.
- **Delivery model: stream from R2 (backend proxy).** Backend validates tenant
  ownership (existing gate) → downloads the object from R2 → streams the bytes
  same-origin. (A 302→presigned URL was tried but breaks the in-app viewer — R2
  has no CORS, see the status note above. Security is the tenant gate before the
  bytes are served.)
- **Backfill:** lazy on-read (existing docs get uploaded to R2 on first access,
  served from R2 thereafter). Optional batch script for day-1 retention/audit.

---

## ⚠️ Must not collide with the prod DB backup

A prod DB backup already uses R2 in the **same account** (see
[backups.md](../deployment/backups.md)). The PDF feature MUST stay disjoint:

| Resource | Rule |
|----------|------|
| Env var `R2_BUCKET` | **Owned by the backup** (`ntssign-backups`). PDFs use a **different** var: `R2_DOCS_BUCKET`. |
| Buckets | PDFs use **separate** buckets: `ntssign-docs-local` / `-staging` / `-prod`. Never write to `ntssign-backups`. |
| Credentials | **Separate** R2 token scoped to the docs buckets: `R2_DOCS_ACCESS_KEY_ID` / `R2_DOCS_SECRET_ACCESS_KEY`. Don't reuse the backup token. |
| `R2_ENDPOINT` | Account-level; read-only reuse is fine. |
| Tooling | Backup uses `aws` CLI; PDFs use `@aws-sdk/client-s3`. No conflict. |

---

## Buckets per environment

Separate bucket per env (same isolation principle as the Resend webhooks):
`ntssign-docs-local`, `ntssign-docs-staging`, `ntssign-docs-prod`. Cleaner blast
radius than one shared bucket with prefixes; well within the R2 free tier.

---

## Implementation plan

| # | Step | Who |
|---|------|-----|
| 1 | Activate R2, create local docs bucket, generate docs-scoped credentials | Owner |
| 2 | `R2Service` (put + presigned get) + `R2_DOCS_*` env config | DEV |
| 3 | Reuse `DocumentFile` (+ enum value for receipts?) — minimal migration | DEV |
| 4 | Receipts: upload on create/send + `DocumentFile` row | DEV |
| 5 | Contracts: upload on `COMPLETED` (webhook) + lazy on-read | DEV |
| 6 | Download endpoints → presigned URL (tenant gate intact) | DEV |
| 7 | Lazy backfill on-read for existing docs | DEV |
| 8 | E2E local test (upload + presigned download, receipt + contract) | DEV |
| 9 | Replicate buckets + credentials for staging/prod | Owner |

### Owner Cloudflare setup (per env)

1. R2 → create bucket (`ntssign-docs-<env>`).
2. R2 → Manage API Tokens → create token, **Object Read & Write**, scoped to the
   docs bucket(s). Save Access Key ID + Secret (shown once).
3. Add to that env's backend `.env` (manual): `R2_DOCS_BUCKET`,
   `R2_DOCS_ACCESS_KEY_ID`, `R2_DOCS_SECRET_ACCESS_KEY` (+ reuse `R2_ENDPOINT` /
   `R2_ACCOUNT_ID`). Then `pm2 reload ntssign-backend --update-env`.
