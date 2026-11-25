import type { ApiResponse } from "@/types/api";

// what the backend said when a request failed: a status, a message, and messages per field
export class ApiRequestError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fields = fields;
  }
}

// if several requests fail with 401 at the same moment, we renew the login only ONCE
let refreshing: Promise<boolean> | null = null;
const refreshSession = (): Promise<boolean> => {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

// asking to renew the login makes no sense for these
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
  retried = false
): Promise<ApiResponse<T>> {
  const hasBody = options.body !== undefined;
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;

  // same address as the website, so the browser sends the login cookie by itself.
  // For files the browser sets the Content-Type itself (it needs a boundary), so we must not
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: hasBody && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: !hasBody ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
  });

  // the 15-minute cookie ran out: renew it with the refresh cookie and try the request once more
  if (response.status === 401 && !retried && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) {
      return apiFetch<T>(path, options, true);
    }
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fields = data && typeof data.result === "object" && data.result ? data.result : {};
    throw new ApiRequestError(data?.message ?? "Something went wrong", response.status, fields);
  }
  return data as ApiResponse<T>;
}