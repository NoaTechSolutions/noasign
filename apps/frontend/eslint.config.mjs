import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Build output of the `verify`/`next build` runs — compiled JS, not source.
    // Same rationale as `.next/**`; without this eslint lints minified output.
    ".next-verify/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, pre-minified bundles shipped as static assets (e.g. the pdf.js
    // worker). Not our source — linting a minified bundle is meaningless and the
    // file is overwritten on every dependency bump.
    "public/**/*.min.js",
    "public/**/*.min.mjs",
  ]),
]);

export default eslintConfig;
