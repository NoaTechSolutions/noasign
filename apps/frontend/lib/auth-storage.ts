export type StoredUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  companyProfileId: string | null;
};

export const AUTH_COOKIE = "noasign_access_token";
const TOKEN_KEY = "noasign.accessToken";
const USER_KEY = "noasign.user";

export function persistSession(token: string, user: StoredUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=86400`;
  window.dispatchEvent(new Event("noasign-auth-change"));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  document.cookie = `${AUTH_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  window.dispatchEvent(new Event("noasign-auth-change"));
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
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
