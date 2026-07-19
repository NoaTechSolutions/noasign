import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Public, unauthenticated health checks for load balancers / uptime monitors.
// Deliberately minimal — NO version, secrets, connection strings, or infra
// details (a verbose health check is a recon hint). Mirrors the public,
// guard-free style of /version.
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: "the process is up". Never touches the DB — a monitor uses this
  // to decide whether the app is running at all. Always 200 while it serves.
  @Get()
  liveness() {
    return { status: 'ok' };
  }

  // Readiness: "the app can serve real traffic", i.e. it can reach Postgres.
  // Trivial `SELECT 1` — cheap enough to be polled every few seconds. Returns
  // 503 if the DB is unreachable; it must NEVER report ok with the DB down.
  // The DB error is swallowed on purpose: the body is a generic { status:
  // 'error' } so a failing check never leaks connection/credential detail.
  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error' });
    }
  }
}
