// Must be the first import — initializes Sentry before anything else loads.
import './instrument';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { createRequestIdMiddleware } from './common/request-id.middleware';

function validateRequiredEnv() {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
    'CORS_ORIGINS',
    'AUTH_COOKIE_DOMAIN',
    'APP_URL',
    'BOLDSIGN_API_KEY',
    'BOLDSIGN_WEBHOOK_SECRET',
    'TURNSTILE_SECRET_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

async function bootstrap() {
  validateRequiredEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { limit: '2mb', extended: true });
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', normalizeTrustProxy(process.env.TRUST_PROXY));

  // First middleware: assign/propagate a correlation id so it wraps the whole
  // request (headers, context) before anything else runs.
  app.use(createRequestIdMiddleware());

  app.use(createSecurityHeadersMiddleware());

  app.enableCors({
    origin: buildCorsOriginHandler(),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(createAuthRateLimitMiddleware());

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
  const authWindowMs = normalizePositiveInteger(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  );
  const authMax = normalizePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 10);
  const contactWindowMs = 60 * 60 * 1000;
  const contactMax = 3;

  const protectedRoutes = new Map<string, { windowMs: number; max: number }>([
    ['POST:/auth/login', { windowMs: authWindowMs, max: authMax }],
    ['POST:/auth/register', { windowMs: authWindowMs, max: authMax }],
    ['POST:/auth/forgot-password', { windowMs: authWindowMs, max: authMax }],
    ['POST:/auth/reset-password', { windowMs: authWindowMs, max: authMax }],
    ['POST:/users/account-requests', { windowMs: authWindowMs, max: authMax }],
    ['POST:/contact', { windowMs: contactWindowMs, max: contactMax }],
    // Public lead capture (post-signature page) — abuse guard, no captcha.
    ['POST:/public/leads', { windowMs: contactWindowMs, max: 5 }],
  ]);
  const entries = new Map<string, { count: number; resetAt: number }>();

  // Prevent unbounded memory growth — prune expired entries every 5 minutes
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) {
          entries.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  ).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const routeKey = `${req.method}:${req.path}`;
    let config = protectedRoutes.get(routeKey);
    // Step-2 lead enrichment: PATCH /public/leads/:id has a dynamic id, so it
    // can't be an exact-match key. Match it by shape and bucket under a fixed
    // route so varying the id can't bypass the per-IP limit.
    let bucketRoute = routeKey;
    if (
      !config &&
      req.method === 'PATCH' &&
      /^\/public\/leads\/[^/]+$/.test(req.path)
    ) {
      config = { windowMs: contactWindowMs, max: 10 };
      bucketRoute = 'PATCH:/public/leads/:id';
    }
    if (!config) {
      next();
      return;
    }

    const now = Date.now();
    const clientIp = resolveClientIp(req);
    const key = `${bucketRoute}:${clientIp}`;
    const existing = entries.get(key);

    if (!existing || existing.resetAt <= now) {
      entries.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      next();
      return;
    }

    if (existing.count >= config.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        retryAfter: retryAfterSeconds,
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
