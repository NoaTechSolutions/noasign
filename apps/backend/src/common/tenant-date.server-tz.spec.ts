/**
 * Frente 2 (timezone): proves the tenant-date logic is SERVER-timezone independent
 * by running the real module in child Node processes pinned to two different zones
 * (UTC and America/Argentina/Buenos_Aires) via the TZ env var set AT SPAWN.
 *
 * Why child processes: assigning process.env.TZ inside a Jest test file does not
 * change the zone — Jest sandboxes process.env as a plain copied object, so Node's
 * env-setter hook that invalidates V8's cached timezone never runs, and Date keeps
 * the machine zone. Setting TZ in the child's spawn environment is the only reliable
 * way, and it also exercises the true production condition (a server booted in an
 * arbitrary zone).
 */
import { execFileSync } from 'child_process';
import * as path from 'path';

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const PROBE = path.join(BACKEND_ROOT, 'test', 'tz-probe.ts');

interface ProbeOutput {
  env: { tz: string | null; offsetMinutesJuly: number };
  results: Record<string, unknown>;
}

function runProbeUnderTz(tz: string): ProbeOutput {
  const stdout = execFileSync(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', PROBE],
    {
      cwd: BACKEND_ROOT,
      env: { ...process.env, TZ: tz },
      encoding: 'utf8',
      timeout: 120_000,
    },
  );
  return JSON.parse(stdout) as ProbeOutput;
}

/** What tenant-date must answer regardless of the server's zone. */
const CANONICAL_RESULTS = {
  localDateMidday: {
    utc: '2026-07-22',
    ny: '2026-07-22',
    ba: '2026-07-22',
  },
  // 2026-07-23T02:00Z: tomorrow for a UTC tenant, still today in NY (22:00) / BA (23:00).
  localDateSplit: {
    utc: '2026-07-23',
    ny: '2026-07-22',
    ba: '2026-07-22',
  },
  todayNotDeferred: { utc: false, ny: false, ba: false },
  tomorrowDeferred: { utc: true, ny: true, ba: true },
  // [1s before tenant-local midnight → not due, at tenant-local midnight → due]
  dueAroundMidnight: {
    utc: [false, true],
    ny: [false, true],
    ba: [false, true],
  },
  splitInstantDue: { utc: true, ny: false },
};

describe('tenant-date — server-TZ independence (real child processes)', () => {
  jest.setTimeout(180_000); // ts-node cold start per child

  let underUtc: ProbeOutput;
  let underBuenosAires: ProbeOutput;

  beforeAll(() => {
    underUtc = runProbeUnderTz('UTC');
    underBuenosAires = runProbeUnderTz('America/Argentina/Buenos_Aires');
  });

  it('the probes really ran under their pinned server zones', () => {
    expect(underUtc.env.tz).toBe('UTC');
    expect(underUtc.env.offsetMinutesJuly).toBe(0);
    expect(underBuenosAires.env.tz).toBe('America/Argentina/Buenos_Aires');
    expect(underBuenosAires.env.offsetMinutesJuly).toBe(180); // UTC-3, no DST
  });

  it('a server in UTC produces exactly the canonical tenant-TZ answers', () => {
    expect(underUtc.results).toEqual(CANONICAL_RESULTS);
  });

  it('a server in Buenos Aires produces exactly the canonical tenant-TZ answers', () => {
    expect(underBuenosAires.results).toEqual(CANONICAL_RESULTS);
  });

  it('both server zones agree bit-for-bit — server TZ is irrelevant', () => {
    expect(underBuenosAires.results).toEqual(underUtc.results);
  });
});
