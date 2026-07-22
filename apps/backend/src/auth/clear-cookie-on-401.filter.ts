import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { clearAuthCookie, resolveAuthCookieOptions } from './auth-cookie';

/**
 * On ANY 401, emit a Set-Cookie that clears the auth cookie.
 *
 * The auth cookie is HttpOnly, so front-end JS is structurally unable to delete
 * it (`clearSession()` only clears localStorage). When the token it carries is
 * rejected — expired, signed with a secret this origin doesn't know, or a
 * deactivated user — the cookie would otherwise SURVIVE. The Next proxy checks
 * only cookie PRESENCE, so it keeps redirecting the "still logged in" user back
 * into the app, which 401s again: the post-deploy reload loop.
 *
 * Clearing the cookie the moment its token is rejected makes the dead session
 * actually end. The proxy then sees no cookie and routes to /login — no loop.
 *
 * Scoped to UnauthorizedException so it only touches genuine auth failures; every
 * other exception still flows to the global (Sentry) filter untouched. The 401
 * body and status are reproduced verbatim, so clients see no behavioural change
 * beyond the added Set-Cookie.
 */
@Catch(UnauthorizedException)
export class ClearCookieOn401Filter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: UnauthorizedException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    const options = resolveAuthCookieOptions(
      this.config.get<string>('AUTH_COOKIE_DOMAIN'),
      this.config.get<string>('JWT_EXPIRES_IN'),
      this.config.get<string>('NODE_ENV'),
    );
    clearAuthCookie(res, options);

    res.status(exception.getStatus()).json(exception.getResponse());
  }
}
