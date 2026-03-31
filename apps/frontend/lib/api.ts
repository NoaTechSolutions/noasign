import { clearSession } from "./auth-storage";
import { API_URL } from "./api-url";

export { API_URL };

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
  const data = text ? (JSON.parse(text) as T | { message?: string }) : null;

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }

    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : undefined;

    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return data as T;
}
