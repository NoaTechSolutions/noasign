// Sentry init for the Edge runtime (middleware, edge API routes).
// Loaded via instrumentation.ts register() hook when NEXT_RUNTIME === 'edge'.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    sampleRate: 1.0,
    tracesSampleRate: 0,
  });
}
