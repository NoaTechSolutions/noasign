// Sentry init for the browser runtime. Runs at page load.
// Loaded automatically by @sentry/nextjs via next.config wrapping.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // 100% errors for current traffic volume.
    sampleRate: 1.0,
    // Performance tracing disabled for v1.
    tracesSampleRate: 0,
    // Session replay disabled for v1 — enable later if needed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
