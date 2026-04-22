// Sentry init for the Node.js server runtime (Next.js server components,
// server actions, API routes). Loaded via instrumentation.ts register() hook.
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
