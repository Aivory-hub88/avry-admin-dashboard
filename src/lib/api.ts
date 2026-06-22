import { getCookie, deleteCookie } from "@/lib/cookies";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getCookie("aivory_access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    deleteCookie("aivory_access_token");
    deleteCookie("aivory_refresh_token");
    if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
      window.location.href = "/admin/signin";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    // Attempt to extract the descriptive error message from the response body
    // FastAPI returns errors as { "detail": "..." }
    let message = `API error: ${res.status}`;
    try {
      const errorBody = await res.json();
      if (errorBody.detail) {
        message = errorBody.detail;
      } else if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // If body parsing fails, fall through with the generic status message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
