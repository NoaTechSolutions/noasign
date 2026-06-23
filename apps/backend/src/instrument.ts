// Sentry must be initialized BEFORE the NestJS app boots so that errors during
// bootstrap are captured. This file is imported as the first line of main.ts.
// If SENTRY_DSN is not set (local dev without Sentry), init is skipped and the
// Sentry SDK becomes a no-op — zero impact on the running process.
//
// This file runs BEFORE NestJS ConfigModule loads the .env, so it cannot rely on
// it and must not depend on how the process launcher (pm2) delivers env. We load
// the SAME cwd-based .env that ConfigModule uses, but here — before Sentry.init
// reads process.env. dotenv does NOT override vars already present, so it is safe
// whether or not pm2 already injected them. This also makes the PROD backend
// robust once SENTRY_* are set there.
import { config as loadEnv } from 'dotenv';
import * as Sentry from '@sentry/nestjs';
import { scrubEvent } from './observability/sentry-scrub';

loadEnv();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Explicit environment so staging and prod never mix. Falls back to
    // NODE_ENV, then 'development'. Set SENTRY_ENVIRONMENT=staging|production
    // in the respective deploys.
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    // Tag which deploy produced the error. npm_package_version is set when the
    // app is started via an npm script (start:dev / start:prod).
    release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,
    // Never auto-attach IPs, cookies, headers or request bodies.
    sendDefaultPii: false,
    // 100% of errors — fine for current traffic volume. Lower if we start
    // exceeding Sentry's free-tier quota.
    sampleRate: 1.0,
    // Performance tracing disabled for v1. Enable with 0.1 sample rate
    // once we have a baseline on error volume.
    tracesSampleRate: 0,
    // Last line of defence: strip secrets/PII before anything leaves the
    // process. See observability/sentry-scrub.ts (unit-tested).
    beforeSend: (event) => scrubEvent(event),
  });
}
