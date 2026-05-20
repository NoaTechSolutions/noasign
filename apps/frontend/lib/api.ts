import { clearSession } from "./auth-storage";
import { API_URL } from "./api-url";

export { API_URL };

// Enriched error preserves the typed fields the backend's AuthException
// carries. Existing callers reading `err.message` still work — Error.message
// is intact. New callers cast `error as ApiError` to read errorCode/retryAfter.
export interface ApiError extends Error {
  status: number;
  errorCode?: string;
  retryAfter?: number;
}

// Paths where 401 must NOT trigger the global redirect-to-"/". The login
// flow needs to display ACCOUNT_LOCKED locally; redirecting would wipe the
// component state and the user never sees the countdown.
const SKIP_AUTO_REDIRECT_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
]);

function handleUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  clearSession();

  if (window.location.pathname !== "/") {
    window.location.replace("/");
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response (proxy error, HTML page, etc.)
  }

  if (!response.ok) {
    if (response.status === 401 && !SKIP_AUTO_REDIRECT_PATHS.has(path)) {
      handleUnauthorized();
    }

    const bodyObj =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};
    const message =
      typeof bodyObj.message === "string"
        ? bodyObj.message
        : `Request failed with status ${response.status}`;

    const err = new Error(message) as ApiError;
    err.status = response.status;
    if (typeof bodyObj.errorCode === "string") {
      err.errorCode = bodyObj.errorCode;
    }
    if (typeof bodyObj.retryAfter === "number") {
      err.retryAfter = bodyObj.retryAfter;
    }
    throw err;
  }

  return data as T;
}
