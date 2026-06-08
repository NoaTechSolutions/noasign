import type { ApiError } from "./api";

// String-literal union, NOT imported from the backend enum — avoids a
// circular/cross-package dep and lets the frontend safely treat unknown
// codes as UNKNOWN fallback rather than crashing on a new value.
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_NOT_ACTIVE"
  | "ACCOUNT_LOCKED"
  | "RATE_LIMITED"
  | "EMAIL_EXISTS"
  | "RESET_TOKEN_INVALID"
  | "UNKNOWN";

export type ParsedAuthError = {
  code: AuthErrorCode;
  message: string;
  // Seconds until retry. Defined for ACCOUNT_LOCKED (from backend, real value)
  // and RATE_LIMITED (60s default — the rate-limiter middleware doesn't ship
  // retryAfter in the body, so we estimate).
  retryAfter?: number;
  status: number;
};

// Fallback cooldown when HTTP 429 hits without a retryAfter hint. See
// apps/backend/src/main.ts createAuthRateLimitMiddleware — it returns
// { message, statusCode } and no retry metadata.
const DEFAULT_RATE_LIMITED_RETRY_AFTER = 60;

export function parseAuthError(error: unknown): ParsedAuthError {
  if (!(error instanceof Error)) {
    return { code: "UNKNOWN", message: "Unknown error", status: 0 };
  }

  const apiErr = error as Partial<ApiError>;
  const status = apiErr.status ?? 0;

  // Preferred path: typed AuthException response from backend
  // (status 401/409/400 with errorCode + optional retryAfter).
  if (apiErr.errorCode) {
    return {
      code: apiErr.errorCode as AuthErrorCode,
      message: error.message,
      retryAfter: apiErr.retryAfter,
      status,
    };
  }

  // HTTP 429 from the rate-limiter middleware (no errorCode in body)
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: error.message || "Too many attempts. Please try again later.",
      retryAfter: DEFAULT_RATE_LIMITED_RETRY_AFTER,
      status,
    };
  }

  // Legacy 401 without errorCode → assume invalid credentials
  if (status === 401) {
    return {
      code: "INVALID_CREDENTIALS",
      message: error.message || "Invalid email or password",
      status,
    };
  }

  return { code: "UNKNOWN", message: error.message, status };
}
