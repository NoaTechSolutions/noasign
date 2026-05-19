// Stable identifiers the frontend branches on. Status alone is ambiguous
// (every auth failure is 401 or 429); the code disambiguates so the UI can
// pick the right message and decide whether to show a countdown, a
// "contact admin" hint, or "try again".
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_ACTIVE = 'ACCOUNT_NOT_ACTIVE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID',
}
