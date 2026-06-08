import { Injectable, Logger } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 storage for document PDFs (receipts + signed contracts).
 *
 * R2 is S3-compatible, so we use the AWS S3 SDK pointed at the R2 endpoint.
 *
 * ⚠️ Uses its OWN env vars (R2_DOCS_*), NEVER the prod DB backup's R2_BUCKET /
 * R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY — those belong to
 * scripts/backup-postgres-to-r2.sh. See docs/architecture/pdf-storage-r2.md.
 *
 * Safe when unconfigured: if the R2_DOCS_* vars are missing the service boots
 * disabled (logs a warning) and throws a clear error if a method is called —
 * the backend still starts. Mirrors EmailService's no-credentials behavior.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor() {
    const accessKeyId = process.env.R2_DOCS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_DOCS_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_DOCS_BUCKET ?? '';

    // Endpoint is account-level and shared with the backup; deriving it from the
    // account id avoids depending on a separate var, but R2_ENDPOINT is honored
    // if present.
    const accountId = process.env.R2_ACCOUNT_ID;
    const endpoint =
      process.env.R2_ENDPOINT ??
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (!accessKeyId || !secretAccessKey || !this.bucket || !endpoint) {
      this.client = null;
      this.logger.warn(
        'R2_DOCS_* not fully set — PDF storage is disabled. Set R2_DOCS_BUCKET, R2_DOCS_ACCESS_KEY_ID, R2_DOCS_SECRET_ACCESS_KEY (+ R2_ACCOUNT_ID or R2_ENDPOINT) to enable.',
      );
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new Error('R2 storage is not configured (R2_DOCS_* missing)');
    }
    return this.client;
  }

  /** Upload a PDF (or any object) to R2 under `key`. */
  async putObject(
    key: string,
    body: Buffer,
    contentType = 'application/pdf',
  ): Promise<void> {
    const client = this.requireClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`[R2Service] Uploaded ${key} (${body.length} bytes)`);
  }

  /** Download an object's bytes from R2 (e.g. to overlay a watermark on it). */
  async getObject(key: string): Promise<Buffer> {
    const client = this.requireClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  /**
   * Generate a short-lived presigned GET URL for `key`. The caller MUST have
   * already authorized the requester (tenant scope) before issuing this.
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 300,
    downloadFileName?: string,
  ): Promise<string> {
    const client = this.requireClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(downloadFileName
          ? {
              ResponseContentDisposition: `attachment; filename="${downloadFileName}"`,
            }
          : {}),
      }),
      { expiresIn: expiresInSeconds },
    );
  }
}
