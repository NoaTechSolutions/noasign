import type { Request, Response } from 'express';

export const AUTH_COOKIE = 'noasign_access_token';

type SameSite = 'lax' | 'strict' | 'none';

export function setAuthCookie(
  response: Response,
  token: string,
  options: {
    maxAgeMs: number;
    secure: boolean;
    domain?: string;
    sameSite?: SameSite;
  },
) {
  response.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
    maxAge: options.maxAgeMs,
  });
}

export function clearAuthCookie(
  response: Response,
  options: {
    secure: boolean;
    domain?: string;
    sameSite?: SameSite;
  },
) {
  response.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
  });
}

export function extractAuthCookieToken(request: Request) {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(AUTH_COOKIE.length + 1).trim();

  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveAuthCookieOptions(
  authCookieDomain: string | undefined,
  jwtExpiresIn: string | undefined,
  nodeEnv: string | undefined,
) {
  return {
    domain: authCookieDomain?.trim() || undefined,
    secure: nodeEnv === 'production',
    sameSite: 'lax' as const,
    maxAgeMs: normalizeJwtCookieMaxAge(jwtExpiresIn),
  };
}

function normalizeJwtCookieMaxAge(value?: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return 86400 * 1000;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized) * 1000;
  }

  const match = normalized.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 86400 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 86400 * 1000;
  }
}
