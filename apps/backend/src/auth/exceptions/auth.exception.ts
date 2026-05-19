import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthErrorCode } from '../constants/auth-error-code.enum';

// Body shape: { statusCode, errorCode, message, retryAfter? }. NestJS's
// default exception serialization already handles HttpException's response
// object, so no custom filter is needed for this class.
export interface AuthErrorBody {
  statusCode: number;
  errorCode: AuthErrorCode;
  message: string;
  retryAfter?: number;
}

export class AuthException extends HttpException {
  constructor(
    errorCode: AuthErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.UNAUTHORIZED,
    retryAfter?: number,
  ) {
    const body: AuthErrorBody = { statusCode: status, errorCode, message };
    if (retryAfter !== undefined) body.retryAfter = retryAfter;
    super(body, status);
  }

  static invalidCredentials(): AuthException {
    return new AuthException(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static accountNotActive(): AuthException {
    return new AuthException(
      AuthErrorCode.ACCOUNT_NOT_ACTIVE,
      'Account is not active',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static emailExists(): AuthException {
    return new AuthException(
      AuthErrorCode.EMAIL_EXISTS,
      'Email already registered',
      HttpStatus.CONFLICT,
    );
  }

  // retryAfter is seconds until the lockout expires — the frontend drives a
  // countdown off it. Status stays 401 (not 423 Locked) because a 423 would
  // also block the Authorization header refresh path on the client.
  static accountLocked(retryAfter: number): AuthException {
    return new AuthException(
      AuthErrorCode.ACCOUNT_LOCKED,
      'Account temporarily locked due to too many failed attempts',
      HttpStatus.UNAUTHORIZED,
      retryAfter,
    );
  }

  // Used for "no such token", "already used", and "expired" — the generic
  // message avoids telling an attacker WHICH failure mode hit.
  static resetTokenInvalid(): AuthException {
    return new AuthException(
      AuthErrorCode.RESET_TOKEN_INVALID,
      'Reset link is invalid or has expired',
      HttpStatus.BAD_REQUEST,
    );
  }
}
