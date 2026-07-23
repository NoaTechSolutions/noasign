import { ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ClearCookieOn401Filter } from './clear-cookie-on-401.filter';
import { AUTH_COOKIE } from './auth-cookie';

// The 401 filter is the loop-breaker: on any auth failure it must clear the
// HttpOnly cookie so the dead session actually ends (proxy sees no cookie →
// /login, no reload storm). With per-environment cookie names it must clear the
// CONFIGURED name AND the legacy default — belt and suspenders — so an orphan
// cookie from the OTHER environment (or from before the rename) is also wiped and
// the user lands on login ONCE.
describe('ClearCookieOn401Filter — clears the right cookie(s)', () => {
  function makeHost(res: Response): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  }

  function makeResponse() {
    const clearCookie = jest.fn();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const res = { clearCookie, status, json } as unknown as Response;
    return { res, clearCookie, status, json };
  }

  function makeConfig(
    values: Record<string, string | undefined>,
  ): ConfigService {
    return {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
  }

  it('with a configured staging name → clears BOTH the staging name and the legacy default', () => {
    const config = makeConfig({
      AUTH_COOKIE_NAME: 'ntssign_access_token_stg',
      AUTH_COOKIE_DOMAIN: '.ntssign.com',
      JWT_EXPIRES_IN: '86400',
      NODE_ENV: 'production',
    });
    const filter = new ClearCookieOn401Filter(config);
    const { res, clearCookie, status, json } = makeResponse();

    filter.catch(new UnauthorizedException('nope'), makeHost(res));

    const clearedNames = clearCookie.mock.calls.map((c) => c[0]);
    expect(clearedNames).toContain('ntssign_access_token_stg');
    expect(clearedNames).toContain(AUTH_COOKIE);
    for (const call of clearCookie.mock.calls) {
      expect(call[1]).toEqual(
        expect.objectContaining({ domain: '.ntssign.com', path: '/' }),
      );
    }
    // The 401 body/status must be reproduced verbatim.
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalled();
  });

  it('with NO configured name (prod default) → clears the legacy cookie exactly once', () => {
    const config = makeConfig({
      AUTH_COOKIE_DOMAIN: '.ntssign.com',
      JWT_EXPIRES_IN: '86400',
      NODE_ENV: 'production',
    });
    const filter = new ClearCookieOn401Filter(config);
    const { res, clearCookie } = makeResponse();

    filter.catch(new UnauthorizedException('nope'), makeHost(res));

    expect(clearCookie).toHaveBeenCalledTimes(1);
    expect(clearCookie.mock.calls[0][0]).toBe(AUTH_COOKIE);
  });
});
