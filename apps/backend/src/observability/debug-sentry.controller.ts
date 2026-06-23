import { Controller, Get, NotFoundException, Post } from '@nestjs/common';

// TEMPORARY — Sentry scrub e2e harness. INERT in production (returns 404).
// Remove before the prod release. See the staging e2e checklist.
//
// The thrown message + the incoming request (Authorization header + body) are
// exactly what Sentry's SentryGlobalFilter captures and beforeSend=scrubEvent
// must redact. Hit it with a fake token header and a fake-PII body.

function isProduction(): boolean {
  return (
    (process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV) === 'production'
  );
}

@Controller('debug/sentry')
export class DebugSentryController {
  @Post('error')
  throwOnPost(): never {
    if (isProduction()) throw new NotFoundException();
    throw new Error(
      'E2E scrub test (backend) — token=Bearer faketoken123 jwt=eyJfakeheader.fakepayload.fakesig',
    );
  }

  @Get('error')
  throwOnGet(): never {
    if (isProduction()) throw new NotFoundException();
    throw new Error(
      'E2E scrub test (backend) — token=Bearer faketoken123 jwt=eyJfakeheader.fakepayload.fakesig',
    );
  }
}
