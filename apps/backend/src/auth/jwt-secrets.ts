import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { getRequiredEnv } from '../config/get-required-env';

/**
 * Ordered list of secrets the app ACCEPTS when verifying a JWT.
 *
 * - Index 0 (`JWT_SECRET`) is also the ONLY secret used to SIGN new tokens.
 * - `JWT_SECRETS_LEGACY` (optional, comma-separated) holds RETIRED secrets kept
 *   for verify-only during a rotation window. This is what makes a secret change
 *   a zero-downtime operation: a session signed with an old secret keeps
 *   validating for as long as that secret stays in the legacy list (a window of
 *   ≥ JWT_EXPIRES_IN), so nobody is logged out by the rotation. After the window
 *   the legacy entry is removed and those (now-expired-anyway) tokens stop
 *   validating.
 *
 * When `JWT_SECRETS_LEGACY` is unset or empty the list is exactly `[JWT_SECRET]`,
 * i.e. behaviour is byte-for-byte identical to a single-secret setup. This is the
 * safe default — the multi-secret machinery is inert until a rotation opts in.
 */
export function getJwtVerificationSecrets(config: ConfigService): string[] {
  const primary = getRequiredEnv(config.get<string>('JWT_SECRET'), 'JWT_SECRET');
  const legacy = (config.get<string>('JWT_SECRETS_LEGACY') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // De-dupe so a legacy list that still contains the current secret can't make us
  // verify the same key twice.
  return [...new Set([primary, ...legacy])];
}

/**
 * Return the FIRST secret whose signature verifies `rawToken`, or null if none do.
 *
 * Expiry is deliberately IGNORED here: the goal is only to identify which key
 * SIGNED the token. passport-jwt re-verifies afterwards with
 * `ignoreExpiration: false` and enforces the deadline, so an expired-but-correctly
 * -signed token still maps to its secret and is then rejected for expiry (a
 * correct 401) rather than being misreported as an unknown key.
 */
export function resolveJwtSecret(
  rawToken: string,
  secrets: string[],
): string | null {
  for (const secret of secrets) {
    try {
      jwt.verify(rawToken, secret, { ignoreExpiration: true });
      return secret;
    } catch {
      // Signature did not match this secret — try the next one.
    }
  }
  return null;
}
