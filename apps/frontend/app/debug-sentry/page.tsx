import { notFound } from "next/navigation";

// TEMPORARY — Sentry scrub e2e harness. INERT in production (404). Remove
// before the prod release.
//
// force-dynamic so this is NEVER prerendered at build time (a build-time throw
// would fail the build). On request, the server-render throw is caught by
// instrumentation.ts onRequestError → captured by the FRONTEND Sentry project
// (server runtime) → beforeSend=scrubEvent redacts the message.
export const dynamic = "force-dynamic";

export default function DebugSentryPage() {
  if (process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT === "production") {
    notFound();
  }
  throw new Error(
    "E2E scrub test (frontend) — token=Bearer faketoken123 email=fake@example.com dni=12345678",
  );
}
