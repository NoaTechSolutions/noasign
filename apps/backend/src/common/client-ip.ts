import type { Request } from 'express';

// Best-effort client IP behind a proxy (Cloudflare/nginx set x-forwarded-for).
// Shared home for what was duplicated inline in main.ts and contact.guard.ts —
// those two can migrate to this later (flagged; not refactored here to keep the
// legal change scoped).
export function resolveClientIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.trim() || req.ip || null;
  }
  return req.ip || req.socket?.remoteAddress || null;
}
