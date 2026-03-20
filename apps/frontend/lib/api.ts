export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";

type RequestOptions = {
  token?: string;
  method?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { token, method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T | { message?: string }) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : undefined;

    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return data as T;
}
