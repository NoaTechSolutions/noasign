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

  // Throttle the hard redirect. The real loop-break lives on the backend: it now
  // clears the auth cookie on every 401 (ClearCookieOn401Filter), so once a dead
  // session is rejected the cookie is gone and the proxy routes to /login instead
  // of bouncing back into the app. This cap is defence in depth — if a cookie
  // ever survives (e.g. a cookie-domain the server can't match), a mismatched
  // session degrades to a single redirect rather than a reload storm at network
  // speed. Mirrors the 10s guard in components/chunk-error-handler.tsx.
  const REDIRECT_KEY = "ntssign:auth-redirect";
  const now = Date.now();
  const last = Number(window.sessionStorage.getItem(REDIRECT_KEY) ?? 0);
  if (last && now - last < 10_000) {
    return;
  }
  window.sessionStorage.setItem(REDIRECT_KEY, String(now));

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
