// Sentry must be initialized BEFORE the NestJS app boots so that errors during
// bootstrap are captured. This file is imported as the first line of main.ts.
// If SENTRY_DSN is not set (local dev without Sentry), init is skipped and the
// Sentry SDK becomes a no-op — zero impact on the running process.
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // 100% of errors — fine for current traffic volume. Lower if we start
    // exceeding Sentry's free-tier quota.
    sampleRate: 1.0,
    // Performance tracing disabled for v1. Enable with 0.1 sample rate
    // once we have a baseline on error volume.
    tracesSampleRate: 0,
  });
}
