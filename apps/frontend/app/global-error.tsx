"use client";

// App Router global error boundary. Next.js renders this when an error escapes
// the root layout, REPLACING it entirely — so it must ship its own <html>/<body>.
//
// We report to Sentry here because React's error-boundary path is NOT covered by
// the SDK's global window handlers. The @sentry/nextjs import is DYNAMIC and runs
// only when an error actually occurs — keeping it out of the normal render keeps
// us clear of the React 19 hydration mismatch documented in NOA-197. With no DSN
// configured (local dev) Sentry never initialised, so captureException is a no-op.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-gray-500">
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-100"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
