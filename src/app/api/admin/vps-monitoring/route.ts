/**
 * VPS Monitoring API route — proxies PromQL queries to Prometheus.
 * Returns graceful error if Prometheus is not available.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  account_type?: string;
  user_metadata?: { account_type?: string };
  exp: number;
}

function isAdmin(token: string): boolean {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return false;
    const role = payload.account_type ?? payload.user_metadata?.account_type;
    return role === "superadmin" || role === "admin";
  } catch {
    return false;
  }
}

const PROMETHEUS_URL =
  process.env.PROMETHEUS_INTERNAL_URL || "http://avry-prometheus:9090";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "instant";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const step = searchParams.get("step") || "30s";

  if (!query) {
    return NextResponse.json({ error: "query parameter required" }, { status: 400 });
  }

  try {
    let prometheusUrl: string;
    const params = new URLSearchParams({ query });

    if (type === "range" && start && end) {
      prometheusUrl = `${PROMETHEUS_URL}/api/v1/query_range`;
      params.set("start", start);
      params.set("end", end);
      params.set("step", step);
    } else {
      prometheusUrl = `${PROMETHEUS_URL}/api/v1/query`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${prometheusUrl}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", error: `Prometheus returned ${res.status}`, data: { result: [] } },
        { status: 200 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    // Prometheus not available — return empty data instead of 503
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        error: `Monitoring service unavailable: ${message}`,
        data: { resultType: type === "range" ? "matrix" : "vector", result: [] },
      },
      { status: 200 }
    );
  }
}
