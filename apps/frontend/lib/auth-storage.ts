export type StoredUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  companyProfileId: string | null;
  mustChangePassword?: boolean;
};

export const AUTH_COOKIE = "ntssign_access_token";
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
