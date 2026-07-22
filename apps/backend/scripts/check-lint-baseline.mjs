// Backend lint ratchet: the build fails ONLY if the total eslint *error* count
// exceeds the committed baseline (apps/backend/.eslint-baseline). Warnings are
// never counted. This lets CI block NEW lint errors without blocking on the
// preexisting legacy debt.
//
// To lower the debt over time: fix some errors, run this script locally
// (`node scripts/check-lint-baseline.mjs`), and commit the lower number in
// .eslint-baseline — a one-line PR. Never raise the baseline.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(backendRoot, '.eslint-baseline');

const raw = readFileSync(baselinePath, 'utf8').trim();
const baseline = Number(raw);
if (!Number.isInteger(baseline) || baseline < 0) {
  console.error(`Invalid baseline in ${baselinePath}: "${raw}" (expected a non-negative integer)`);
  process.exit(2);
}

// Same glob as the "lint" npm script, but WITHOUT --fix and via the ESLint API
// so we can count instead of just pass/fail.
const eslint = new ESLint({ cwd: backendRoot, errorOnUnmatchedPattern: false });
const results = await eslint.lintFiles(['{src,apps,libs,test}/**/*.ts']);

const errors = results.reduce((n, r) => n + r.errorCount, 0);
const warnings = results.reduce((n, r) => n + r.warningCount, 0);

console.log(`Backend lint ratchet -> errors: ${errors}, baseline: ${baseline} (warnings: ${warnings}, not counted)`);

if (errors > baseline) {
  const formatter = await eslint.loadFormatter('stylish');
  const output = await formatter.format(results.filter((r) => r.errorCount > 0));
  if (output) console.log(output);
  console.error(
    `FAIL: ${errors} lint errors > baseline ${baseline}. New lint errors were introduced — fix them instead of raising the baseline.`,
  );
  process.exit(1);
}

if (errors < baseline) {
  console.log(
    `Below baseline (${errors} < ${baseline}). Consider lowering apps/backend/.eslint-baseline to ${errors} to lock in the progress.`,
  );
}
console.log('OK: backend lint did not get worse.');
