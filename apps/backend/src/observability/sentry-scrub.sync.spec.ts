import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guards the DUPLICATED PII scrubber until it is extracted to a shared package
// (v1.1). The backend copy is the unit-tested source of truth; the frontend
// copy MUST stay byte-identical so the browser strips EXACTLY the same data.
//
// Comparing the two files to EACH OTHER (not to a fixed hash) makes this robust
// to line-ending normalisation in CI — both files get the same treatment.
//
// If this fails: copy one file over the other so they match again, e.g.
//   cp apps/backend/src/observability/sentry-scrub.ts apps/frontend/lib/sentry-scrub.ts
describe('sentry-scrub copies stay in sync', () => {
  const BACKEND = join(__dirname, 'sentry-scrub.ts');
  const FRONTEND = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'apps',
    'frontend',
    'lib',
    'sentry-scrub.ts',
  );

  it('backend and frontend scrubbers are byte-identical', () => {
    const backend = readFileSync(BACKEND, 'utf8');
    const frontend = readFileSync(FRONTEND, 'utf8');
    expect(frontend).toBe(backend);
  });
});
