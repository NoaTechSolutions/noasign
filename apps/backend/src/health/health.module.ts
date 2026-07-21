import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

// PrismaModule is @Global, so PrismaService is injectable here without importing.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
