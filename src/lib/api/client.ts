import type { ApiErrorBody, ApiSuccess } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

/** Stable query string: empty values are dropped and keys sorted so equal queries produce equal strings. */
export function buildQuery(params?: QueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

type RequestOptions = { signal?: AbortSignal };

async function send<T>(method: string, url: string, body?: unknown, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK", "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return { data: undefined as T };

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // Non-JSON bodies are reported below with a generic message.
  }

  if (!response.ok) {
    const error = (json as ApiErrorBody | null)?.error;
    if (response.status === 401 && typeof window !== "undefined") redirectToLogin();
    throw new ApiError(response.status, error?.code ?? "ERROR", error?.message ?? "Request failed.", error?.fields);
  }
  return json as ApiSuccess<T>;
}

// An expired or revoked session sends the user to sign in and back to where they were.
function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(new URL(`/login?next=${encodeURIComponent(next)}`, window.location.origin).toString());
}

export const apiClient = {
  get: <T>(url: string, params?: QueryParams, options?: RequestOptions) => send<T>("GET", `${url}${buildQuery(params)}`, undefined, options),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) => send<T>("POST", url, body ?? {}, options),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) => send<T>("PUT", url, body ?? {}, options),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) => send<T>("PATCH", url, body ?? {}, options),
  delete: <T = void>(url: string, options?: RequestOptions) => send<T>("DELETE", url, undefined, options),
};
