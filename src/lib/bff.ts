import { getCookie } from "@/lib/cookies";
import { NextRequest, NextResponse } from "next/server";
import { getServiceUrl, ServiceName } from "@/lib/services";

/** Standard 401 response that also clears stale auth cookies. */
export function unauthorized() {
  const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  response.cookies.delete("aivory_access_token");
  response.cookies.delete("aivory_refresh_token");
  return response;
}

/** Extract the access token from the request cookies. */
export function getAccessToken(request: NextRequest): string | undefined {
  return request.cookies.get("aivory_access_token")?.value;
}

interface ProxyOptions {
  service: ServiceName;
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token: string;
  body?: unknown;
  query?: Record<string, string>;
}

interface ProxyResult {
  ok: boolean;
  status: number;
  data: unknown;
  /** True when the service URL is not configured. */
  notConfigured?: boolean;
  /** True when the service could not be reached. */
  unreachable?: boolean;
}

/**
 * Proxy a request from a BFF route to a backing microservice.
 *
 * Handles URL resolution, auth forwarding, query strings, JSON bodies and
 * normalizes failure modes so callers can decide how to respond.
 */
export async function proxyToService({
  service,
  path,
  method = "GET",
  token,
  body,
  query,
}: ProxyOptions): Promise<ProxyResult> {
  const base = getServiceUrl(service);
  if (!base) {
    return { ok: false, status: 503, data: null, notConfigured: true };
  }

  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const url = `${base}${path}${qs}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status, data };
    }

    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 502, data: null, unreachable: true };
  }
}

/**
 * Client-side fetch wrapper for BFF (same-origin) API routes.
 * Attaches the access token from cookies automatically.
 */
export async function bffFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getCookie("aivory_access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(path, { ...options, headers });
}
