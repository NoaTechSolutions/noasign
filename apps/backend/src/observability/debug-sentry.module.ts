import { Module } from '@nestjs/common';
import { DebugSentryController } from './debug-sentry.controller';

// TEMPORARY — Sentry scrub e2e harness module. Remove before the prod release.
@Module({
  controllers: [DebugSentryController],
})
export class DebugSentryModule {}
