/**
 * BFF (Backend-For-Frontend) utilities.
 *
 * Server-side: helpers for Next.js API routes to proxy requests to
 * internal microservices over the Docker network.
 *
 * Client-side: a fetch wrapper that prepends the basePath ("/admin") so
 * browser-initiated requests reach the admin container via Traefik.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

// ─── Service URL map ─────────────────────────────────────────────────────────
const SERVICE_URLS: Record<string, string | undefined> = {
  backend: process.env.BACKEND_SERVICE_URL,
  payments: process.env.PAYMENTS_SERVICE_URL,
  diagnostics: process.env.DIAGNOSTICS_SERVICE_URL,
  blueprint: process.env.BLUEPRINT_SERVICE_URL,
  roadmap: process.env.ROADMAP_SERVICE_URL,
  workflows: process.env.WORKFLOWS_SERVICE_URL,
  blog: process.env.BLOG_SERVICE_URL,
  careers: process.env.CAREERS_SERVICE_URL,
};

// Fallback when per-service URL is not configured
const DEFAULT_BACKEND =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

// ─── Server-side helpers ─────────────────────────────────────────────────────

/**
 * Extract the bearer token from the incoming request's Authorization header
 * or from the `aivory_access_token` cookie.
 *
 * The browser can send DUPLICATE `aivory_access_token` cookies (host-only vs
 * domain=.aivory.id — the landing page stamps the latter from stale
 * localStorage). `request.cookies.get()` silently picks one of them; if it
 * picks the stale duplicate, that token gets forwarded to the backend, fails
 * signature verification there, and every proxied feature breaks (HTTP
 * 401/403 on charts, "Could not load users", ...). So parse the raw Cookie
 * header and prefer the duplicate that looks like a current admin token
 * (non-expired, admin/superadmin, has the email claim legacy tokens lack).
 */
export function getAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const candidates: string[] = [];
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === "aivory_access_token") {
      const v = part.slice(eq + 1).trim();
      if (v) candidates.push(decodeURIComponent(v));
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple duplicates — rank them: current-format valid admin token first.
  let fallback: string | null = null;
  for (const token of candidates) {
    try {
      const payload = jwtDecode<{
        exp: number;
        email?: string;
        account_type?: string;
        user_metadata?: { account_type?: string };
      }>(token);
      if (payload.exp * 1000 < Date.now()) continue;
      const accountType =
        payload.account_type ?? payload.user_metadata?.account_type;
      const isAdmin =
        accountType === "superadmin" || accountType === "admin";
      if (isAdmin && payload.email) return token; // current format — best
      if (isAdmin && !fallback) fallback = token; // legacy but plausible
    } catch {
      // undecodable duplicate — skip
    }
  }
  return fallback ?? candidates[0];
}

/**
 * Return a standard 401 JSON response.
 */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

interface ProxyOptions {
  service: string;
  path: string;
  method?: string;
  token: string;
  body?: unknown;
  query?: Record<string, string>;
}

interface ProxyResult {
  ok: boolean;
  status: number;
  data: unknown;
  notConfigured?: boolean;
  unreachable?: boolean;
}

/**
 * Proxy a request to an internal microservice.
 * Resolves the service URL from environment variables and forwards
 * the request with the provided bearer token.
 */
export async function proxyToService(
  options: ProxyOptions
): Promise<ProxyResult> {
  const { service, path, method = "GET", token, body, query } = options;

  const baseUrl = SERVICE_URLS[service] || DEFAULT_BACKEND;
  if (!baseUrl) {
    return { ok: false, status: 503, data: null, notConfigured: true };
  }

  let url = `${baseUrl}${path}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const init: RequestInit = { method, headers };
  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON response — ignore
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 502, data: null, unreachable: true };
  }
}

/**
 * Proxy a download (CSV, PDF) straight through to the caller.
 *
 * `proxyToService` parses the body as JSON, which would corrupt a file, so this
 * streams the response untouched and forwards the headers that make a browser
 * save it — notably Content-Disposition, which carries the server's timestamped
 * filename.
 */
export async function proxyDownload(options: {
  service: string;
  path: string;
  token: string;
  query?: Record<string, string>;
}): Promise<NextResponse> {
  const { service, path, token, query } = options;

  const baseUrl = SERVICE_URLS[service] || DEFAULT_BACKEND;
  if (!baseUrl) {
    return NextResponse.json({ error: `${service} service is not configured` }, { status: 503 });
  }

  let url = `${baseUrl}${path}`;
  if (query && Object.keys(query).length > 0) {
    url += `?${new URLSearchParams(query).toString()}`;
  }

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Export failed (${res.status})` },
        { status: res.status === 401 ? 401 : 502 }
      );
    }
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "text/csv; charset=utf-8",
        "Content-Disposition":
          res.headers.get("content-disposition") ?? 'attachment; filename="export.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: `Could not reach ${service} service` }, { status: 502 });
  }
}

/**
 * Collect a known set of query params from an incoming request.
 *
 * Whitelisted so an arbitrary client-supplied param can't be forwarded into the
 * upstream service's query string.
 */
export function pickQuery(
  request: NextRequest,
  keys: readonly string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null && value !== "") out[key] = value;
  }
  return out;
}

// ─── Client-side helper ──────────────────────────────────────────────────────

export const BASE_PATH = "/admin";

/**
 * Fetch wrapper for the admin dashboard's own Next.js API routes.
 * Automatically prepends the basePath ("/admin") so the request
 * reaches the correct container via Traefik.
 *
 * Use this for client-side fetch calls to the app's own BFF routes
 * (e.g. /api/admin/users, /api/auth/login).
 */
export function bffFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  // If the path already starts with the basePath, don't double-prefix
  const url = path.startsWith(BASE_PATH) ? path : `${BASE_PATH}${path}`;
  return fetch(url, init);
}
