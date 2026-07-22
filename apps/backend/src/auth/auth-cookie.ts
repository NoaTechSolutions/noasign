import type { Request, Response } from 'express';

/**
 * Legacy / default auth cookie name. This is what prod uses today and what every
 * environment falls back to when AUTH_COOKIE_NAME is unset — so a deploy with NO
 * new env vars is byte-identical to the current behaviour.
 */
export const AUTH_COOKIE = 'ntssign_access_token';

type SameSite = 'lax' | 'strict' | 'none';

export interface AuthCookieOptions {
  /** Resolved cookie name — the per-environment isolation knob. */
  name: string;
  maxAgeMs: number;
  secure: boolean;
  domain?: string;
  sameSite?: SameSite;
}

/**
 * Resolve the cookie NAME from config, defaulting to the legacy name.
 *
 * prod and staging share the ntssign.com apex, so Domain-scoping alone cannot
 * separate their session cookies: within each environment the cookie must reach
 * BOTH api.* (cross-origin fetch, credentials:include) and app.* (Next middleware
 * presence check), which forces Domain=.ntssign.com in both. A distinct NAME per
 * environment is therefore the only clean isolation — set AUTH_COOKIE_NAME on the
 * staging VM (e.g. ntssign_access_token_stg) and the two stop clobbering each
 * other. Unset → legacy name → prod unchanged.
 */
export function resolveAuthCookieName(
  authCookieName: string | undefined,
): string {
  return authCookieName?.trim() || AUTH_COOKIE;
}

export function setAuthCookie(
  response: Response,
  token: string,
  options: AuthCookieOptions,
) {
  response.cookie(options.name, token, {
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
  options: AuthCookieOptions,
) {
  response.clearCookie(options.name, {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
  });
}

/**
 * Clear BOTH the configured cookie name AND the legacy default — belt and
 * suspenders. On a 401 an orphan cookie from the OTHER environment (or from
 * before a name change) must be wiped too, otherwise the proxy keeps seeing a
 * cookie it can't authenticate and the reload loop survives. De-duped so that
 * when the configured name IS the default only one Set-Cookie is emitted.
 */
export function clearAuthCookies(
  response: Response,
  options: AuthCookieOptions,
) {
  const names = [...new Set([options.name, AUTH_COOKIE])];
  for (const name of names) {
    clearAuthCookie(response, { ...options, name });
  }
}

/**
 * Build a passport-jwt extractor bound to a specific cookie name. The name is
 * resolved once at strategy construction (from AUTH_COOKIE_NAME); the extractor
 * reads ONLY that name, so a staging API never picks up a prod-named cookie
 * sitting on the same browser (that's the whole point of the isolation).
 */
export function createAuthCookieTokenExtractor(cookieName: string) {
  return (request: Request): string | null => {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`));

    if (!cookie) {
      return null;
    }

    const value = cookie.slice(cookieName.length + 1).trim();

    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
}

export function resolveAuthCookieOptions(
  authCookieDomain: string | undefined,
  jwtExpiresIn: string | undefined,
  nodeEnv: string | undefined,
  authCookieName?: string,
): AuthCookieOptions {
  return {
    name: resolveAuthCookieName(authCookieName),
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
