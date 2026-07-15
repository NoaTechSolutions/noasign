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
