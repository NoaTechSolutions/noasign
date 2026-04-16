#!/usr/bin/env bash
set -euo pipefail

# Export the NTSsign landing page as static HTML for SiteGround hosting.
# This script temporarily modifies config, builds, extracts, and restores.

FRONTEND="apps/frontend"
OUT_DIR="landing-export"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

restore() {
  cd "$ROOT"
  mv "$FRONTEND/next.config.ts.bak" "$FRONTEND/next.config.ts" 2>/dev/null || true
  mv "$FRONTEND/proxy.ts.bak" "$FRONTEND/proxy.ts" 2>/dev/null || true
  mv "$FRONTEND/app/signature-complete/page.tsx.bak" "$FRONTEND/app/signature-complete/page.tsx" 2>/dev/null || true
  mv "$FRONTEND/app/robots.ts.bak" "$FRONTEND/app/robots.ts" 2>/dev/null || true
  mv "$FRONTEND/app/sitemap.ts.bak" "$FRONTEND/app/sitemap.ts" 2>/dev/null || true
  echo "--- Original config restored ---"
}
trap restore EXIT

echo "=== Exporting NTSsign landing page ==="

# --- 1. Backup files we need to modify ---
cp "$FRONTEND/next.config.ts" "$FRONTEND/next.config.ts.bak"
cp "$FRONTEND/proxy.ts" "$FRONTEND/proxy.ts.bak"
cp "$FRONTEND/app/signature-complete/page.tsx" "$FRONTEND/app/signature-complete/page.tsx.bak"
cp "$FRONTEND/app/robots.ts" "$FRONTEND/app/robots.ts.bak"
cp "$FRONTEND/app/sitemap.ts" "$FRONTEND/app/sitemap.ts.bak"

# --- 2. Configure for static export ---
cat > "$FRONTEND/next.config.ts" << 'CONF'
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
CONF

# Neuter proxy (must export a valid function in Next.js 16)
cat > "$FRONTEND/proxy.ts" << 'PROXY'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
export const config = { matcher: [] };
PROXY

# Force dynamic routes to be static for export
if ! head -1 "$FRONTEND/app/signature-complete/page.tsx" | grep -q 'force-static'; then
  sed -i '1s/^/export const dynamic = "force-static";\n/' "$FRONTEND/app/signature-complete/page.tsx"
fi

# Replace robots.ts and sitemap.ts with static-compatible versions
cat > "$FRONTEND/app/robots.ts" << 'ROBOTS'
import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}
ROBOTS

cat > "$FRONTEND/app/sitemap.ts" << 'SITEMAP'
import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://ntssign.com/", lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
SITEMAP

echo "--- Config set for static export ---"

# --- 3. Build ---
cd "$FRONTEND"
npx next build 2>&1
cd "$ROOT"

echo "--- Build complete ---"

# --- 4. Copy output to landing-export/ ---
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Copy everything Next.js exported (index, terms, privacy, cookies, _next, img, favicon, robots, sitemap).
cp -r "$FRONTEND/out/." "$OUT_DIR/"

# Remove SaaS-only routes that don't belong on the landing domain.
# Each route in Next's static export produces a directory + .html + .txt at the same level.
for route in signature-complete dashboard login; do
  rm -rf "$OUT_DIR/$route"
  rm -f "$OUT_DIR/$route.html" "$OUT_DIR/$route.txt"
done

echo "--- Files copied to $OUT_DIR/ ---"

# --- 5. Summary (restore happens via trap EXIT) ---
echo ""
echo "=== Export complete ==="
echo "Files in $OUT_DIR/:"
find "$OUT_DIR" -type f | head -30
echo ""
echo "Total size: $(du -sh "$OUT_DIR" | cut -f1)"
echo ""
echo "To test: open $OUT_DIR/index.html in a browser"
echo "To deploy: upload $OUT_DIR/ contents to SiteGround public_html/"
