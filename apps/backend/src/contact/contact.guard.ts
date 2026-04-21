import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);
  private readonly verifyUrl =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const token = body.turnstileToken;

    if (typeof token !== 'string' || !token.trim()) {
      throw new ForbiddenException('Missing Turnstile token');
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      this.logger.error(
        'TURNSTILE_SECRET_KEY not set — rejecting request',
      );
      throw new ForbiddenException('Turnstile not configured');
    }

    const clientIp = resolveClientIp(req);
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (clientIp) {
      params.append('remoteip', clientIp);
    }

    let data: TurnstileVerifyResponse;
    try {
      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      data = (await response.json()) as TurnstileVerifyResponse;
    } catch (error) {
      this.logger.error(
        `Turnstile siteverify request failed: ${String(error)}`,
      );
      throw new ForbiddenException('Turnstile verification unavailable');
    }

    if (!data.success) {
      this.logger.warn(
        `Turnstile verification rejected: ${JSON.stringify(data['error-codes'] ?? [])}`,
      );
      throw new ForbiddenException('Turnstile verification failed');
    }

    return true;
  }
}

function resolveClientIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.trim() || req.ip || null;
  }

  return req.ip || req.socket.remoteAddress || null;
}
