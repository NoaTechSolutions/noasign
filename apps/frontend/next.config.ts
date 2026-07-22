import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Verify builds can target a separate output dir (NEXT_BUILD_DIST_DIR=.next-verify)
  // so a green-gate build never clobbers the running dev server's .next. Unset in
  // dev/normal builds → defaults to .next (no behavior change).
  distDir: process.env.NEXT_BUILD_DIST_DIR || ".next",
  turbopack: {
    root: path.join(__dirname),
  },
  // Single source of truth for the app version (shown in the dashboard footer).
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  async headers() {
    return [
      {
        // HTML documents must always be revalidated. Next prerenders /, /login
        // and /dashboard as static and stamps them `s-maxage=31536000`. That
        // directive only binds shared caches — browsers ignore it, and with no
        // `no-cache`/`max-age` they fall back to heuristic freshness and keep
        // serving the pre-deploy HTML. That stale document references chunk
        // hashes the new build already rotated → ChunkLoadError → the handler
        // in components/chunk-error-handler.tsx reloads → same cached HTML →
        // loop every 10s. `no-cache` still allows ETag revalidation (cheap
        // 304s); it just forbids serving the document without asking first.
        // Hashed assets under /_next/static are excluded so they keep their
        // immutable long-lived cache.
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Silence the "no auth token" warning during build — we're not uploading
  // source maps in v1. Enable later by setting SENTRY_AUTH_TOKEN + org/project.
  silent: true,
  // Skip source map upload when auth token is missing (build still succeeds).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Don't auto-inject a tunnel route; not using ad-block bypass.
  tunnelRoute: undefined,
});
