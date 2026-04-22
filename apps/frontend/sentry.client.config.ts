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
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && dsn !== "DISABLED") {
  import("@sentry/nextjs").then((Sentry) => {
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
  });
}
