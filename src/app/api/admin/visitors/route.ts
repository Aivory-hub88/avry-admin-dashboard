/**
 * /api/admin/visitors — aggregated visit metrics.
 *
 * Spec: admin-templates-visitors (Req 13, 18.2, 18.3)
 *
 * GET ?range=7d|30d|all  (default 30d)
 * Auth: cookie required; 401 on miss clears both auth cookies.
 *
 * [SUPABASE MIGRATION] Previously queried Supabase page_visits table.
 * Now returns empty results until backend visitors endpoint is available.
 */
import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decodeJwt, isTokenExpired } from "@/lib/jwt";
// [SUPABASE MIGRATION] aggregateVisits is no longer needed without data
// import { aggregateVisits, VisitRange, VisitRow } from "@/lib/aggregateVisits";

type VisitRange = "7d" | "30d" | "all";

function unauthorized(): NextResponse {
  const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  res.cookies.delete("aivory_access_token");
  res.cookies.delete("aivory_refresh_token");
  return res;
}

const ALLOWED_RANGES: readonly VisitRange[] = ["7d", "30d", "all"];

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return unauthorized();
  try {
    const payload = decodeJwt(token);
    if (isTokenExpired(payload)) return unauthorized();
  } catch {
    return unauthorized();
  }

  const rangeParam = request.nextUrl.searchParams.get("range");
  let range: VisitRange = "30d";
  if (rangeParam !== null) {
    if (!ALLOWED_RANGES.includes(rangeParam as VisitRange)) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }
    range = rangeParam as VisitRange;
  }

  // [SUPABASE MIGRATION] Previously:
  // const { data, error } = await supabaseAdmin
  //   .from("page_visits")
  //   .select("page, country_code, country_name, visited_at");
  //
  // const rows = (data ?? []) as VisitRow[];
  // const aggregate = aggregateVisits(rows, range, Date.now());
  // return NextResponse.json(aggregate);
  //
  // Returning empty aggregate until backend visitors endpoint is available.
  return NextResponse.json({
    totals: {
      allTime: 0,
      last7Days: 0,
      last30Days: 0,
      today: 0,
    },
    byCountry: [],
    byPage: [],
    daily: [],
    uniqueCountries: 0,
  });
}
