import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { getJwtVerificationSecrets, resolveJwtSecret } from './jwt-secrets';

// A ConfigService stub that reads from a plain map.
function config(env: Record<string, string | undefined>): ConfigService {
  return {
    get: <T>(key: string): T => env[key] as unknown as T,
  } as unknown as ConfigService;
}

const PRIMARY = 'primary-secret-new-unified';
const LEGACY_VM = 'legacy-secret-vm-old';
const LEGACY_ORACLE = 'legacy-secret-oracle-old';

describe('getJwtVerificationSecrets', () => {
  it('with no JWT_SECRETS_LEGACY → returns exactly [JWT_SECRET] (identical to today)', () => {
    expect(getJwtVerificationSecrets(config({ JWT_SECRET: PRIMARY }))).toEqual([
      PRIMARY,
    ]);
  });

  it('empty JWT_SECRETS_LEGACY → still just [JWT_SECRET]', () => {
    expect(
      getJwtVerificationSecrets(
        config({ JWT_SECRET: PRIMARY, JWT_SECRETS_LEGACY: '  ' }),
      ),
    ).toEqual([PRIMARY]);
  });

  it('appends legacy secrets in order, primary first', () => {
    expect(
      getJwtVerificationSecrets(
        config({
          JWT_SECRET: PRIMARY,
          JWT_SECRETS_LEGACY: `${LEGACY_VM},${LEGACY_ORACLE}`,
        }),
      ),
    ).toEqual([PRIMARY, LEGACY_VM, LEGACY_ORACLE]);
  });

  it('trims whitespace and drops empty entries', () => {
    expect(
      getJwtVerificationSecrets(
        config({
          JWT_SECRET: PRIMARY,
          JWT_SECRETS_LEGACY: ` ${LEGACY_VM} , , ${LEGACY_ORACLE} ,`,
        }),
      ),
    ).toEqual([PRIMARY, LEGACY_VM, LEGACY_ORACLE]);
  });

  it('de-dupes when the primary also appears in the legacy list', () => {
    expect(
      getJwtVerificationSecrets(
        config({
          JWT_SECRET: PRIMARY,
          JWT_SECRETS_LEGACY: `${PRIMARY},${LEGACY_VM}`,
        }),
      ),
    ).toEqual([PRIMARY, LEGACY_VM]);
  });

  it('throws when JWT_SECRET is missing (no silent fallback)', () => {
    expect(() => getJwtVerificationSecrets(config({}))).toThrow(
      'JWT_SECRET is required',
    );
  });
});

describe('resolveJwtSecret', () => {
  const secrets = [PRIMARY, LEGACY_VM, LEGACY_ORACLE];
  const sign = (secret: string, opts?: jwt.SignOptions) =>
    jwt.sign({ sub: 'user-1' }, secret, opts);

  it('✅ a token signed with the NEW primary secret validates', () => {
    expect(resolveJwtSecret(sign(PRIMARY), secrets)).toBe(PRIMARY);
  });

  it('✅ a token signed with a LEGACY secret validates during the window', () => {
    expect(resolveJwtSecret(sign(LEGACY_VM), secrets)).toBe(LEGACY_VM);
    expect(resolveJwtSecret(sign(LEGACY_ORACLE), secrets)).toBe(LEGACY_ORACLE);
  });

  it('🔒 a token signed with an UNKNOWN secret is rejected (null)', () => {
    expect(resolveJwtSecret(sign('some-other-secret'), secrets)).toBeNull();
  });

  it('🔒 once the legacy secret is retired, its tokens no longer resolve', () => {
    const afterWindow = [PRIMARY]; // JWT_SECRETS_LEGACY removed
    expect(resolveJwtSecret(sign(LEGACY_VM), afterWindow)).toBeNull();
  });

  it('matches an EXPIRED but correctly-signed token to its secret (expiry is enforced later by passport)', () => {
    const expired = sign(LEGACY_VM, { expiresIn: '-1h' });
    // resolveJwtSecret ignores expiry on purpose — it only identifies the key.
    expect(resolveJwtSecret(expired, secrets)).toBe(LEGACY_VM);
  });

  it('a garbage / non-JWT string resolves to null, not a throw', () => {
    expect(resolveJwtSecret('not-a-jwt', secrets)).toBeNull();
    expect(resolveJwtSecret('', secrets)).toBeNull();
  });
});
