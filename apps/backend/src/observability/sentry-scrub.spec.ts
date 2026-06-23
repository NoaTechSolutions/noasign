import {
  REDACTED,
  ScrubbableEvent,
  scrubEvent,
  scrubString,
} from './sentry-scrub';

// Fake-but-realistic secrets. NONE of these are real credentials — they only
// need to MATCH the shapes the scrubber looks for.
const FAKE_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYiLCJuYW1lIjoiSm9obiJ9.abc123_DEF-456signature';
const FAKE_BEARER = `Bearer ${FAKE_JWT}`;
const FAKE_TURNSTILE = '0x4AAAAAAABkMYinukE8nzYS';
const FAKE_API_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'; // 32 hex chars

describe('scrubString', () => {
  it('redacts JWTs', () => {
    expect(scrubString(`token is ${FAKE_JWT} ok`)).toBe(
      `token is ${REDACTED} ok`,
    );
  });

  it('redacts Bearer tokens', () => {
    expect(scrubString(`auth ${FAKE_BEARER}`)).toContain(REDACTED);
    expect(scrubString(`auth ${FAKE_BEARER}`)).not.toContain('eyJ');
  });

  it('redacts Turnstile / 0x hex secrets', () => {
    expect(scrubString(`secret=${FAKE_TURNSTILE}`)).toBe(`secret=${REDACTED}`);
  });

  it('redacts long hex API keys', () => {
    expect(scrubString(`key ${FAKE_API_KEY}`)).toBe(`key ${REDACTED}`);
  });

  it('leaves ordinary text untouched', () => {
    expect(scrubString('user opened the dashboard')).toBe(
      'user opened the dashboard',
    );
  });
});

describe('scrubString — PII in free text (v1.1)', () => {
  it('redacts emails', () => {
    expect(scrubString('login failed for jane.doe@test.com here')).toBe(
      `login failed for ${REDACTED} here`,
    );
  });

  it('redacts DNI — dotted and bare 7-8 digits', () => {
    expect(scrubString('dni 12.345.678 ok')).toBe(`dni ${REDACTED} ok`);
    expect(scrubString('dni 12345678 ok')).toBe(`dni ${REDACTED} ok`);
    expect(scrubString('dni 1234567 ok')).toBe(`dni ${REDACTED} ok`);
  });

  it('redacts CUIT/CUIL — dashed and bare 11 digits', () => {
    expect(scrubString('cuit 20-12345678-9 end')).toBe(`cuit ${REDACTED} end`);
    expect(scrubString('cuit 20123456789 end')).toBe(`cuit ${REDACTED} end`);
  });

  it('redacts phone numbers — international and grouped', () => {
    const intl = scrubString('call +54 9 11 2345-6789 now');
    expect(intl).toContain(REDACTED);
    expect(intl).not.toContain('2345');
    expect(scrubString('tel 11-2345-6789')).toBe(`tel ${REDACTED}`);
  });

  it('does NOT over-redact short numbers, years or normal text', () => {
    expect(scrubString('opened 3 docs in 2026')).toBe('opened 3 docs in 2026');
    expect(scrubString('status 404 on page 2')).toBe('status 404 on page 2');
    expect(scrubString('order #15 shipped')).toBe('order #15 shipped');
  });

  it('redacts PII embedded in an exception message via scrubEvent', () => {
    const event = scrubEvent({
      message: 'signup failed for jane@test.com (dni 12345678)',
      exception: { values: [{ value: 'duplicate cuit 20-12345678-9' }] },
    });
    expect(event.message).not.toContain('jane@test.com');
    expect(event.message).not.toContain('12345678');
    expect(event.message).toContain(REDACTED);
    expect(event.exception?.values?.[0]?.value).not.toContain('20-12345678-9');
  });
});

describe('scrubEvent', () => {
  it('redacts Authorization and Cookie headers', () => {
    const event = scrubEvent({
      request: {
        url: 'https://api.example.com/customers',
        headers: {
          Authorization: FAKE_BEARER,
          Cookie: 'session=abc; refresh=def',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    });

    expect(event.request?.headers?.Authorization).toBe(REDACTED);
    expect(event.request?.headers?.Cookie).toBe(REDACTED);
    // Non-sensitive header preserved.
    expect(event.request?.headers?.['User-Agent']).toBe('Mozilla/5.0');
  });

  it('redacts the cookies bag entirely', () => {
    const event = scrubEvent({
      request: { url: '/customers', cookies: { session: 'abc', jwt: 'def' } },
    });
    expect(event.request?.cookies).toBe(REDACTED);
  });

  it('drops the WHOLE body for sensitive routes (/auth/*)', () => {
    const event = scrubEvent({
      request: {
        url: 'https://api.example.com/auth/login',
        data: { email: 'jane@test.com', password: 'hunter2' },
        query_string: 'redirect=/dashboard&email=jane@test.com',
      },
    });
    expect(event.request?.data).toBe(REDACTED);
    expect(event.request?.query_string).toBe(REDACTED);
  });

  it('drops the WHOLE body for sensitive routes (/documents/*)', () => {
    const event = scrubEvent({
      request: {
        url: '/documents/receipt/123/pdf',
        data: { signerName: 'Jane Doe', dni: '12345678' },
      },
    });
    expect(event.request?.data).toBe(REDACTED);
  });

  it('on non-sensitive routes, redacts sensitive keys but keeps the rest', () => {
    const event = scrubEvent({
      request: {
        url: '/customers',
        data: {
          page: 'dashboard',
          token: FAKE_JWT,
          nested: { password: 'hunter2', label: 'keep-me' },
        },
      },
    });

    const data = event.request?.data as Record<string, unknown>;
    expect(data.page).toBe('dashboard');
    expect(data.token).toBe(REDACTED);
    const nested = data.nested as Record<string, unknown>;
    expect(nested.password).toBe(REDACTED);
    expect(nested.label).toBe('keep-me');
  });

  it('redacts sensitive values inside query strings on non-sensitive routes', () => {
    const event = scrubEvent({
      request: {
        url: '/customers',
        query_string: 'sort=name&email=jane@test.com&token=' + FAKE_JWT,
      },
    });
    const qs = event.request?.query_string;
    expect(qs).toContain('sort=name');
    expect(qs).toContain(`email=${REDACTED}`);
    expect(qs).toContain(`token=${REDACTED}`);
    expect(qs).not.toContain('jane@test.com');
  });

  it('scrubs tokens in message and exception values', () => {
    const event = scrubEvent({
      message: `request failed with ${FAKE_BEARER}`,
      exception: {
        values: [{ value: `DB error, jwt=${FAKE_JWT}` }],
      },
    });
    expect(event.message).not.toContain('eyJ');
    expect(event.exception?.values?.[0]?.value).not.toContain('eyJ');
    expect(event.exception?.values?.[0]?.value).toContain(REDACTED);
  });

  it('redacts sensitive keys in extra', () => {
    const event = scrubEvent({
      extra: { requestId: 'req-1', apiKey: FAKE_API_KEY, note: 'ok' },
    });
    expect(event.extra?.requestId).toBe('req-1');
    expect(event.extra?.apiKey).toBe(REDACTED);
    expect(event.extra?.note).toBe('ok');
  });

  it('scrubs breadcrumb messages and data', () => {
    const event = scrubEvent({
      breadcrumbs: [
        { message: `called with ${FAKE_BEARER}`, data: { token: FAKE_JWT } },
      ],
    });
    expect(event.breadcrumbs?.[0]?.message).not.toContain('eyJ');
    expect(event.breadcrumbs?.[0]?.data?.token).toBe(REDACTED);
  });

  it('is cycle-safe and never throws on weird shapes', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    const event: ScrubbableEvent = { extra: cyclic };
    expect(() => scrubEvent(event)).not.toThrow();
  });

  it('returns the event unchanged when there is nothing sensitive', () => {
    const event = scrubEvent({
      message: 'plain error',
      request: { url: '/customers', headers: { 'User-Agent': 'x' } },
    });
    expect(event.message).toBe('plain error');
    expect(event.request?.headers?.['User-Agent']).toBe('x');
  });
});
