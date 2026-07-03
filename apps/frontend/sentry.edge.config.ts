// Sentry init for the Edge runtime (middleware, edge API routes).
// Loaded via instrumentation.ts register() hook when NEXT_RUNTIME === 'edge'.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Edge runtime has full env access. Prefer the server var, then the public
    // one, then NODE_ENV. Set SENTRY_ENVIRONMENT=staging|production.
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
      process.env.NODE_ENV ??
      "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    sendDefaultPii: false,
    sampleRate: 1.0,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}
