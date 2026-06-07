/**
 * VPS Monitoring Users API — returns list of users with active containers
 * for the user selector dropdown.
 *
 * Admin-only: validates aivory_access_token cookie.
 * Queries the metrics collector's per-user metrics to discover active user IDs,
 * or falls back to Supabase if available.
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

function validateAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return false;
    const accountType = resolveAccountType(payload);
    return !!accountType && ["superadmin", "admin"].includes(accountType);
  } catch {
    return false;
  }
}

const PROMETHEUS_URL =
  process.env.PROMETHEUS_INTERNAL_URL || "http://avry-prometheus:9090";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!validateAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Query Prometheus for unique user_ids from the per-user metrics
    const query = 'group by (user_id, user_tier) (avry_user_cpu_seconds_total)';
    const params = new URLSearchParams({ query });
    const res = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to query monitoring service", users: [] },
        { status: 502 }
      );
    }

    const data = await res.json();
    const results = data?.data?.result || [];

    interface UserInfo {
      userId: string;
      tier: string;
    }

    const users: UserInfo[] = results.map(
      (r: { metric: { user_id: string; user_tier: string } }) => ({
        userId: r.metric.user_id,
        tier: r.metric.user_tier,
      })
    );

    // Sort by userId for consistent ordering
    users.sort((a: UserInfo, b: UserInfo) => a.userId.localeCompare(b.userId));

    return NextResponse.json({ users });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch user list";
    return NextResponse.json(
      { error: message, users: [] },
      { status: 503 }
    );
  }
}
