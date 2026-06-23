// Framework-agnostic PII/secret scrubber for Sentry events.
//
// This is the SINGLE SOURCE OF TRUTH for what we strip before an event leaves
// the process. The same logic ships in two places and MUST be kept in sync:
//   - backend:  apps/backend/src/observability/sentry-scrub.ts  (unit-tested)
//   - frontend: apps/frontend/lib/sentry-scrub.ts               (byte-identical copy)
// A CI test (sentry-scrub.sync.spec.ts) FAILS the build if these two files
// drift. No shared package exists in this repo (no workspace), so the copy is
// manual — see the v1.1 NOTE about extracting to a shared package.
//
// Pure functions, ZERO dependencies: trivially unit-testable and impossible to
// couple to a specific Sentry SDK build. Wire it via:
//   beforeSend: (event) => scrubEvent(event)

export const REDACTED = '[REDACTED]';

/**
 * Minimal structural shape of the parts of a Sentry event we touch. We do NOT
 * import the SDK's Event type so the helper stays portable and trivially
 * testable. No index signature on purpose: the SDK's ErrorEvent is an interface
 * and would NOT be assignable to a type that declares one (TS rule).
 */
export interface ScrubbableEvent {
  message?: string;
  request?: {
    url?: string;
    headers?: Record<string, unknown>;
    cookies?: Record<string, unknown> | string;
    data?: unknown;
    query_string?: string | Record<string, unknown> | Array<[string, string]>;
  };
  extra?: Record<string, unknown>;
  exception?: { values?: Array<{ value?: string } | undefined> };
  breadcrumbs?: Array<
    { message?: string; data?: Record<string, unknown> } | undefined
  >;
}

// Keys whose VALUE must never be sent, matched case-insensitively as a
// substring of the key name. Covers auth material and obvious client PII.
const SENSITIVE_KEY =
  /(authorization|cookie|set-cookie|password|passwd|secret|token|api[-_]?key|access[-_]?key|jwt|session|otp|ssn|cvv|card|email|phone|dni|cuit|tax[-_]?id)/i;

// Request paths whose body/query may carry credentials or signer PII — for
// these we drop the WHOLE body, no field-by-field guessing.
const SENSITIVE_PATH = /\/(auth|documents)(\/|\?|#|$)/i;

// Token-shaped substrings to redact wherever they appear in free text
// (messages, exception values, breadcrumb text, header values).
const TOKEN_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi, // Authorization: Bearer xxx
  /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, // JWT header.payload.sig
  /0x[A-Za-z0-9_-]{16,}/g, // Turnstile (base62) / 0x-prefixed secrets
  /\b[A-Fa-f0-9]{32,}\b/g, // long hex API keys / hashes
];

const MAX_DEPTH = 8;

/** Redact token-shaped substrings inside a free-text string. */
export function scrubString(input: string): string {
  let out = input;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Recursively redact sensitive keys and token-shaped strings in an arbitrary
 * value. Sensitive keys -> REDACTED. Plain strings -> token-scrubbed. Bounded
 * depth, cycle-safe. Returns a new value; does not mutate the input.
 */
function scrubValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (typeof value === 'string') return scrubString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key)
      ? REDACTED
      : scrubValue(val, depth + 1, seen);
  }
  return out;
}

function scrubRecord(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!record) return record;
  return scrubValue(record, 0, new WeakSet()) as Record<string, unknown>;
}

function scrubHeaders(
  headers: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!headers) return headers;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(headers)) {
    out[key] = SENSITIVE_KEY.test(key)
      ? REDACTED
      : typeof val === 'string'
        ? scrubString(val)
        : val;
  }
  return out;
}

function scrubQueryString(
  query: string | Record<string, unknown> | Array<[string, string]> | undefined,
): string | Record<string, unknown> | Array<[string, string]> | undefined {
  if (query == null) return query;
  if (typeof query === 'string') {
    // Redact the value of any sensitive key in a "k=v&k=v" string, then
    // token-scrub whatever remains.
    const scrubbed = query
      .split('&')
      .map((pair) => {
        const eq = pair.indexOf('=');
        if (eq === -1) return pair;
        const key = pair.slice(0, eq);
        return SENSITIVE_KEY.test(decodeURIComponentSafe(key))
          ? `${key}=${REDACTED}`
          : pair;
      })
      .join('&');
    return scrubString(scrubbed);
  }
  if (Array.isArray(query)) {
    return query.map(
      ([k, v]) =>
        [k, SENSITIVE_KEY.test(k) ? REDACTED : scrubString(String(v))] as [
          string,
          string,
        ],
    );
  }
  return scrubRecord(query);
}

function isSensitivePath(url: string | undefined): boolean {
  if (!url) return false;
  // `url` may be absolute (https://host/auth/login?x=1) or a bare path; the
  // pattern matches either.
  return SENSITIVE_PATH.test(url);
}

/**
 * Scrub a Sentry event in place and return it. Wire as `beforeSend`.
 * Defensive: never throws on unexpected shapes — it errs toward dropping data.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (!event || typeof event !== 'object') return event;

  if (typeof event.message === 'string') {
    event.message = scrubString(event.message);
  }

  if (event.request) {
    const req = event.request;
    req.headers = scrubHeaders(req.headers);
    if (req.cookies !== undefined) req.cookies = REDACTED;

    if (isSensitivePath(req.url)) {
      // Sensitive route: drop body + query entirely.
      if (req.data !== undefined) req.data = REDACTED;
      if (req.query_string !== undefined) req.query_string = REDACTED;
    } else {
      if (req.data !== undefined) {
        req.data = scrubValue(req.data, 0, new WeakSet());
      }
      req.query_string = scrubQueryString(req.query_string);
    }
  }

  if (event.extra) {
    event.extra = scrubRecord(event.extra);
  }

  if (event.exception?.values) {
    for (const entry of event.exception.values) {
      if (entry && typeof entry.value === 'string') {
        entry.value = scrubString(entry.value);
      }
    }
  }

  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (!crumb) continue;
      if (typeof crumb.message === 'string') {
        crumb.message = scrubString(crumb.message);
      }
      if (crumb.data) crumb.data = scrubRecord(crumb.data);
    }
  }

  return event;
}
