import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

// A minimal PrismaService stand-in whose `$queryRaw` we control per test.
function makePrisma(queryRaw: () => Promise<unknown>): PrismaService {
  return { $queryRaw: queryRaw } as unknown as PrismaService;
}

describe('HealthController', () => {
  describe('GET /health (liveness)', () => {
    it('returns 200-shape { status: ok } without touching the DB', () => {
      let dbTouched = false;
      const controller = new HealthController(
        makePrisma(async () => {
          dbTouched = true;
          return [{ 1: 1 }];
        }),
      );

      expect(controller.liveness()).toEqual({ status: 'ok' });
      // Liveness must NOT hit the DB — a dead DB must not fail liveness.
      expect(dbTouched).toBe(false);
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('returns { status: ok } when the DB responds', async () => {
      const controller = new HealthController(
        makePrisma(async () => [{ '?column?': 1 }]),
      );
      await expect(controller.readiness()).resolves.toEqual({ status: 'ok' });
    });

    it('throws ServiceUnavailableException (503) when the DB is unreachable', async () => {
      const controller = new HealthController(
        makePrisma(async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
        }),
      );
      // Must NOT resolve ok while the DB is down — the "Saved! that lies" in infra form.
      await expect(controller.readiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('does not leak the underlying DB error detail in the 503 body', async () => {
      const controller = new HealthController(
        makePrisma(async () => {
          throw new Error('password authentication failed for user "app"');
        }),
      );
      try {
        await controller.readiness();
        fail('expected readiness to throw');
      } catch (err) {
        const body = (err as ServiceUnavailableException).getResponse();
        expect(JSON.stringify(body)).not.toContain('password');
        expect(body).toEqual({ status: 'error' });
      }
    });
  });
});
