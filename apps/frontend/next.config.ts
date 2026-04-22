import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.join(__dirname),
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
