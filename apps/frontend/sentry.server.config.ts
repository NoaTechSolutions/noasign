// Sentry init for the Node.js server runtime (Next.js server components,
// server actions, API routes). Loaded via instrumentation.ts register() hook.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Server runtime has full env access. Prefer the server var, then the
    // public one, then NODE_ENV. Set SENTRY_ENVIRONMENT=staging|production.
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
