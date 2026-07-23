export type StoredUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  companyProfileId: string | null;
  mustChangePassword?: boolean;
};

// Per-environment cookie name. prod and staging share the ntssign.com apex, so
// the session cookie needs Domain=.ntssign.com in both — a distinct NAME is what
// keeps them from clobbering each other. The Next middleware (proxy.ts) reads this
// name to decide redirects, so it MUST match the backend's AUTH_COOKIE_NAME.
// Unset → legacy name → prod behaviour unchanged (inert default).
export const AUTH_COOKIE =
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME?.trim() || "ntssign_access_token";
const USER_KEY = "ntssign.user";

export function persistSession(user: StoredUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("ntssign-auth-change"));
}

export function clearSession() {
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("ntssign-auth-change"));
}

export function getStoredUser(): StoredUser | null {
  const storedUser = window.localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as StoredUser;
  } catch {
    clearSession();
    return null;
  }
}

export function updateStoredUser(user: StoredUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("ntssign-auth-change"));
}
