import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', normalizeTrustProxy(process.env.TRUST_PROXY));

  app.use(createSecurityHeadersMiddleware());
  app.use(createAuthRateLimitMiddleware());

  app.enableCors({
    origin: buildCorsOriginHandler(),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);
  console.log(`Backend listening on http://${host}:${port}`);
}
bootstrap();

function buildCorsOriginHandler() {
  const allowedOrigins = new Set(
    (
      process.env.CORS_ORIGINS?.split(',') ?? [
        'http://127.0.0.1:3001',
        'http://localhost:3001',
      ]
    )
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

function createSecurityHeadersMiddleware() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    next();
  };
}

function createAuthRateLimitMiddleware() {
  const windowMs = normalizePositiveInteger(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  );
  const maxRequests = normalizePositiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX,
    10,
  );
  const protectedPaths = new Set([
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/users/account-requests',
  ]);
  const entries = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!protectedPaths.has(req.path)) {
      next();
      return;
    }

    const now = Date.now();
    const clientIp = resolveClientIp(req);
    const key = `${req.path}:${clientIp}`;
    const existing = entries.get(key);

    if (!existing || existing.resetAt <= now) {
      entries.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        message: 'Too many authentication attempts. Please try again later.',
        statusCode: 429,
      });
      return;
    }

    existing.count += 1;
    entries.set(key, existing);
    next();
  };
}

function resolveClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.trim() || req.ip || 'unknown';
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function normalizeTrustProxy(value?: string) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return 1;
  }

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return normalized;
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  return Math.floor(normalized);
}
