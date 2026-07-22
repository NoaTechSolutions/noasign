import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { extractAuthCookieToken } from '../auth-cookie';
import { getJwtVerificationSecrets, resolveJwtSecret } from '../jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Accept any secret in the verification list (new unified + retired legacy),
    // not just one. This is what lets a JWT_SECRET rotation happen without logging
    // anyone out. With no JWT_SECRETS_LEGACY set the list is [JWT_SECRET] and this
    // behaves exactly like the previous single-secret `secretOrKey`.
    const secrets = getJwtVerificationSecrets(configService);
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractAuthCookieToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      // passport-jwt resolves ONE key per request via this provider, then verifies
      // the token with it under the options above (so expiry is still enforced).
      // We identify the signing key by trying each secret; unknown key → 401.
      secretOrKeyProvider: (
        _req: unknown,
        rawToken: string,
        done: (err: Error | null, secret?: string) => void,
      ) => {
        const secret = resolveJwtSecret(rawToken, secrets);
        if (secret) {
          done(null, secret);
          return;
        }
        done(new Error('No matching JWT secret'));
      },
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    companyProfileId?: string | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      companyProfileId: user.companyProfileId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
