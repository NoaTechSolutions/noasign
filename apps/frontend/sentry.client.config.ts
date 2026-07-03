// Sentry init for the browser runtime. Runs at page load.
// Loaded automatically by @sentry/nextjs via next.config wrapping.
//
// IMPORTANT: the @sentry/nextjs import is dynamic and gated on DSN presence.
// Statically importing the module runs auto-instrumentation (Image onError/
// onLoad wrapping, fetch patching, etc.) which causes React 19 hydration
// mismatches even when Sentry.init is not called — the function identities
// differ between server and client renders. With a dynamic import, the
// module is not loaded at all in local dev (DSN empty) → zero side effects.
// See NOA-197 for the real fix (mount-gate the theme-dependent classes in
// login-form.tsx so hydration is stable regardless of Sentry).
//
// NOTE: the scrub helper is a plain, dependency-free module (no Sentry import),
// so importing it statically is safe — it does NOT trigger the auto-
// instrumentation that causes the hydration mismatch described above.
import { scrubEvent } from "./lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && dsn !== "DISABLED") {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      // Browser bundle: only NEXT_PUBLIC_* vars are inlined, so the env tag
      // MUST be NEXT_PUBLIC_SENTRY_ENVIRONMENT (plain SENTRY_ENVIRONMENT is
      // undefined client-side). Falls back to NODE_ENV.
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
        process.env.NODE_ENV ??
        "development",
      // Tag which deploy produced the error (inlined from package.json version).
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      // Never auto-attach IPs, cookies, headers or request bodies.
      sendDefaultPii: false,
      // 100% errors for current traffic volume.
      sampleRate: 1.0,
      // Performance tracing disabled for v1.
      tracesSampleRate: 0,
      // Session replay disabled for v1 — enable later if needed.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      // Strip secrets/PII before anything leaves the browser.
      beforeSend: (event) => scrubEvent(event),
    });
  });
}
