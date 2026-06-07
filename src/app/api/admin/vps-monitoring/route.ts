/**
 * VPS Monitoring API route — proxies PromQL queries to Prometheus.
 *
 * Admin-only: validates aivory_access_token cookie (admin or superadmin).
 * Supports both instant queries (/api/v1/query) and range queries
 * (/api/v1/query_range) via the `type` parameter.
 *
 * User isolation: when `userId` is provided, wraps queries with the
 * appropriate label filter ({user_id="..."}) so only that user's metrics
 * are returned.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub?: string;
  user_metadata?: { account_type?: string };
  app_metadata?: { account_type?: string };
  account_type?: string;
  exp: number;
}

function resolveAccountType(payload: JwtPayload): string | undefined {
  return (
    payload.user_metadata?.account_type ??
    payload.app_metadata?.account_type ??
    payload.account_type
  );
}

function validateAdminToken(token: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!token) return { valid: false, error: "No token provided" };
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) {
      return { valid: false, error: "Token expired" };
    }
    const accountType = resolveAccountType(payload);
    if (!accountType || !["superadmin", "admin"].includes(accountType)) {
      return { valid: false, error: "Insufficient permissions" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid token" };
  }
}

// Internal Prometheus URL — accessible via Docker network
const PROMETHEUS_URL =
  process.env.PROMETHEUS_INTERNAL_URL || "http://avry-prometheus:9090";

export async function GET(request: NextRequest) {
  // RBAC: validate admin token
  const token = request.cookies.get("aivory_access_token")?.value;
  const auth = validateAdminToken(token);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "instant"; // "instant" | "range"
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const step = searchParams.get("step");
  const userId = searchParams.get("userId");

  if (!query) {
    return NextResponse.json(
      { error: "Missing required parameter: query" },
      { status: 400 }
    );
  }

  // User isolation: inject user_id label filter when filtering per-user
  let finalQuery = query;
  if (userId) {
    // Sanitize userId to prevent PromQL injection
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_\-@.]/g, "");
    if (sanitizedUserId !== userId) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }
    // Wrap with user_id label selector
    finalQuery = query.replace(
      /\{([^}]*)\}/g,
      `{$1, user_id="${sanitizedUserId}"}`
    );
    // If query has no existing labels, add them
    if (!query.includes("{")) {
      finalQuery = query.replace(
        /([a-zA-Z_:][a-zA-Z0-9_:]*)/,
        `$1{user_id="${sanitizedUserId}"}`
      );
    }
  }

  try {
    let prometheusUrl: string;
    const params = new URLSearchParams();
    params.set("query", finalQuery);

    if (type === "range") {
      prometheusUrl = `${PROMETHEUS_URL}/api/v1/query_range`;
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      if (step) params.set("step", step);
    } else {
      prometheusUrl = `${PROMETHEUS_URL}/api/v1/query`;
    }

    const res = await fetch(`${prometheusUrl}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Prometheus returned ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to query Prometheus";
    return NextResponse.json(
      { error: "Monitoring service unavailable", detail: message },
      { status: 503 }
    );
  }
}
