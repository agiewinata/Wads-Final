"use client";

/** Read the csrf-token cookie that middleware sets on every response. */
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Drop-in replacement for fetch() that automatically attaches the CSRF token
 * header to state-changing requests (POST, PUT, PATCH, DELETE).
 * Safe to use for GET requests too — the header is simply omitted.
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (!mutating) return fetch(input, init);

  const token = getCsrfToken();
  const existingHeaders =
    init.headers instanceof Headers
      ? init.headers
      : new Headers((init.headers ?? {}) as Record<string, string>);

  if (token) existingHeaders.set("x-csrf-token", token);
  return fetch(input, { ...init, headers: existingHeaders });
}
