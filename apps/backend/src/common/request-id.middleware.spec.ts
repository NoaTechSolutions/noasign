import type { NextFunction, Request, Response } from 'express';
import { createRequestIdMiddleware } from './request-id.middleware';
import { getRequestId } from './request-context';

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    res: {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    } as unknown as Response,
    headers,
  };
}

describe('createRequestIdMiddleware', () => {
  it('mints a request id when none is provided, echoes it in the response header, and exposes it inside the request context', () => {
    const middleware = createRequestIdMiddleware();
    const { res, headers } = fakeRes();
    let idInsideContext: string | undefined;
    const next: NextFunction = () => {
      idInsideContext = getRequestId();
    };

    middleware({ headers: {} } as Request, res, next);

    expect(headers['X-Request-Id']).toBeTruthy();
    // the header echoed and the ambient id must be the SAME value
    expect(idInsideContext).toBe(headers['X-Request-Id']);
  });

  it('REUSES an incoming X-Request-Id so a trace spans hops', () => {
    const middleware = createRequestIdMiddleware();
    const { res, headers } = fakeRes();
    let idInsideContext: string | undefined;
    const next: NextFunction = () => {
      idInsideContext = getRequestId();
    };

    middleware(
      { headers: { 'x-request-id': 'upstream-abc-123' } } as unknown as Request,
      res,
      next,
    );

    expect(headers['X-Request-Id']).toBe('upstream-abc-123');
    expect(idInsideContext).toBe('upstream-abc-123');
  });

  it('mints a fresh id when the incoming header is blank/whitespace', () => {
    const middleware = createRequestIdMiddleware();
    const { res, headers } = fakeRes();
    const next: NextFunction = () => {};

    middleware(
      { headers: { 'x-request-id': '   ' } } as unknown as Request,
      res,
      next,
    );

    expect(headers['X-Request-Id']).toBeTruthy();
    expect(headers['X-Request-Id']).not.toBe('   ');
  });

  it('getRequestId() is undefined outside any request context', () => {
    expect(getRequestId()).toBeUndefined();
  });
});
