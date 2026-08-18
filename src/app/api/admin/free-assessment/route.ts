import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Free assessment: funnel stats and captured leads, in one response.
 *
 * The page always renders both together, so fetching them separately would
 * only buy two spinners and two chances to fail. Both come from avry-backend:
 *   GET /api/v1/assessment-leads/stats?days=N
 *   GET /api/v1/assessment-leads?limit=N
 *
 * getAccessToken (not request.cookies.get) is deliberate: the browser can hold
 * duplicate aivory_access_token cookies and picking the stale one 401s here.
 */

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const url = new URL(request.url);
  const days = url.searchParams.get("days") ?? "30";
  const limit = url.searchParams.get("limit") ?? "500";

  const [stats, leads] = await Promise.all([
    proxyToService({
      service: "backend",
      path: "/api/v1/assessment-leads/stats",
      token,
      query: { days },
    }),
    proxyToService({
      service: "backend",
      path: "/api/v1/assessment-leads",
      token,
      query: { limit },
    }),
  ]);

  if (stats.status === 401 || leads.status === 401) return unauthorized();

  // Stats need Postgres and 503 when it is down; leads fall back to the file
  // store and keep working. Surfacing them independently means a database blip
  // costs the funnel chart, not the lead list sales actually works from.
  return NextResponse.json({
    stats: stats.ok ? stats.data : null,
    statsError: stats.ok ? null : `stats unavailable (${stats.status})`,
    leads: leads.ok ? leads.data : null,
    leadsError: leads.ok ? null : `leads unavailable (${leads.status})`,
  });
}
