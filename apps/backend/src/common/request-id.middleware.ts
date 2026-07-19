import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestId } from './request-context';

// A correlation id per request, for tracing a single request across log lines
// and across services. If the caller (a proxy / another service) already sent an
// `X-Request-Id`, we REUSE it so the trace spans hops; otherwise we mint a UUID.
// The id is echoed back in the `X-Request-Id` response header and stored in the
// per-request context (getRequestId()) for the rest of the request.
//
// Additive and non-behavioural: it never changes a response body or status — it
// only adds a header and an ambient id.
export function createRequestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.trim() !== ''
        ? incoming.trim()
        : randomUUID();

    res.setHeader('X-Request-Id', requestId);
    runWithRequestId(requestId, () => next());
  };
}
