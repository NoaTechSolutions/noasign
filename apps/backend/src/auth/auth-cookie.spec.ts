import type { Request, Response } from 'express';
import {
  AUTH_COOKIE,
  clearAuthCookies,
  createAuthCookieTokenExtractor,
  resolveAuthCookieName,
  resolveAuthCookieOptions,
  setAuthCookie,
} from './auth-cookie';

// The cookie NAME is the per-environment isolation knob. Prod and staging share
// the ntssign.com apex, so Domain-scoping alone cannot keep their session cookies
// apart (both need Domain=.ntssign.com so the cookie reaches api.* AND app.* of
// their own env). A distinct NAME per environment stops them clobbering each other.
// The default MUST stay the current name so prod behaves identically with no env
// change — same inert-by-default philosophy as JWT_SECRETS_LEGACY.
describe('auth-cookie — per-environment name + domain resolution', () => {
  describe('resolveAuthCookieName', () => {
    it('defaults to the legacy name when unset (prod behaviour unchanged)', () => {
      expect(resolveAuthCookieName(undefined)).toBe(AUTH_COOKIE);
      expect(resolveAuthCookieName('')).toBe(AUTH_COOKIE);
      expect(resolveAuthCookieName('   ')).toBe(AUTH_COOKIE);
    });

    it('uses the configured name when provided (staging opt-in)', () => {
      expect(resolveAuthCookieName('ntssign_access_token_stg')).toBe(
        'ntssign_access_token_stg',
      );
    });

    it('trims surrounding whitespace', () => {
      expect(resolveAuthCookieName('  ntssign_access_token_stg  ')).toBe(
        'ntssign_access_token_stg',
      );
    });
  });

  describe('resolveAuthCookieOptions', () => {
    it('carries the resolved name alongside domain/secure/sameSite/maxAge', () => {
      const opts = resolveAuthCookieOptions(
        '.ntssign.com',
        '86400',
        'production',
        'ntssign_access_token_stg',
      );
      expect(opts).toEqual({
        name: 'ntssign_access_token_stg',
        domain: '.ntssign.com',
        secure: true,
        sameSite: 'lax',
        maxAgeMs: 86400 * 1000,
      });
    });

    it('falls back to the legacy name when no name is configured', () => {
      const opts = resolveAuthCookieOptions(
        '.ntssign.com',
        '86400',
        'production',
      );
      expect(opts.name).toBe(AUTH_COOKIE);
    });
  });

  describe('setAuthCookie', () => {
    it('writes the resolved cookie name', () => {
      const cookie = jest.fn();
      const res = { cookie } as unknown as Response;
      setAuthCookie(res, 'tok', {
        name: 'ntssign_access_token_stg',
        maxAgeMs: 1000,
        secure: true,
        domain: '.ntssign.com',
        sameSite: 'lax',
      });
      expect(cookie).toHaveBeenCalledWith(
        'ntssign_access_token_stg',
        'tok',
        expect.objectContaining({
          domain: '.ntssign.com',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 1000,
        }),
      );
    });
  });

  describe('clearAuthCookies — belt and suspenders', () => {
    it('clears BOTH the configured name and the legacy default (distinct names)', () => {
      const clearCookie = jest.fn();
      const res = { clearCookie } as unknown as Response;
      clearAuthCookies(res, {
        name: 'ntssign_access_token_stg',
        maxAgeMs: 0,
        secure: true,
        domain: '.ntssign.com',
        sameSite: 'lax',
      });
      const names = clearCookie.mock.calls.map((c) => c[0]);
      expect(names).toContain('ntssign_access_token_stg');
      expect(names).toContain(AUTH_COOKIE);
      // both cleared with the SAME domain so the browser matches the stored cookie
      for (const call of clearCookie.mock.calls) {
        expect(call[1]).toEqual(
          expect.objectContaining({ domain: '.ntssign.com', path: '/' }),
        );
      }
    });

    it('emits the clear only ONCE when the configured name equals the default', () => {
      const clearCookie = jest.fn();
      const res = { clearCookie } as unknown as Response;
      clearAuthCookies(res, {
        name: AUTH_COOKIE,
        maxAgeMs: 0,
        secure: true,
        domain: '.ntssign.com',
        sameSite: 'lax',
      });
      expect(clearCookie).toHaveBeenCalledTimes(1);
      expect(clearCookie.mock.calls[0][0]).toBe(AUTH_COOKIE);
    });
  });

  describe('createAuthCookieTokenExtractor', () => {
    const makeReq = (cookieHeader?: string): Request =>
      ({ headers: { cookie: cookieHeader } }) as unknown as Request;

    it('extracts the token stored under the configured name', () => {
      const extract = createAuthCookieTokenExtractor(
        'ntssign_access_token_stg',
      );
      const req = makeReq('ntssign_access_token_stg=abc.def.ghi');
      expect(extract(req)).toBe('abc.def.ghi');
    });

    it('ignores a cookie stored under the OTHER environment name (isolation)', () => {
      // A staging API configured for _stg must NOT pick up prod's cookie, otherwise
      // the two environments would read each other's tokens again.
      const extract = createAuthCookieTokenExtractor(
        'ntssign_access_token_stg',
      );
      const req = makeReq('ntssign_access_token=prod.token.here');
      expect(extract(req)).toBeNull();
    });

    it('defaults to the legacy name and extracts it', () => {
      const extract = createAuthCookieTokenExtractor(AUTH_COOKIE);
      const req = makeReq('ntssign_access_token=abc.def.ghi');
      expect(extract(req)).toBe('abc.def.ghi');
    });

    it('returns null when no cookie header is present', () => {
      const extract = createAuthCookieTokenExtractor(AUTH_COOKIE);
      expect(extract(makeReq(undefined))).toBeNull();
    });
  });
});
