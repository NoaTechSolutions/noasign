import { Controller, Get } from '@nestjs/common';
import { execSync } from 'child_process';

// Resolve the running commit. An explicit env var wins (set it in the deploy if
// the runtime ever loses the git checkout); otherwise read HEAD from the git
// checkout the process runs inside (the staging VM deploys via `git pull`, so
// HEAD is the deployed commit). Falls back to 'unknown' when neither is present.
function resolveCommit(): string {
  const fromEnv = (
    process.env.GIT_COMMIT ||
    process.env.SOURCE_VERSION ||
    process.env.COMMIT_SHA ||
    ''
  ).trim();
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

// Public, unauthenticated: exposes only non-sensitive build/version info so a
// deploy (e.g. push to staging) can be confirmed by hitting GET /version.
@Controller('version')
export class VersionController {
  // Resolved ONCE at boot: the deploy restarts the process, so each deploy
  // reports its own fresh HEAD. Avoids running git on every request.
  private readonly info = {
    commit: resolveCommit(),
    buildTime: process.env.BUILD_TIME ?? null,
    startedAt: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'unknown',
  };

  @Get()
  getVersion() {
    return { ...this.info, commitShort: this.info.commit.slice(0, 7) };
  }
}
