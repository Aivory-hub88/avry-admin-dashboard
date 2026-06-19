/**
 * /api/admin/visitors — aggregated visit metrics from PostgreSQL.
 * Auth: requires admin cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { Pool } from "pg";
import { aggregateVisits, VisitRange, VisitRow } from "@/lib/aggregateVisits";

interface JwtPayload {
  account_type?: string;
  exp: number;
}

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30000,
    });
  }
  return _pool;
}

function isAdmin(token: string): boolean {
  try {
    const p = jwtDecode<JwtPayload>(token);
    if (p.exp * 1000 < Date.now()) return false;
    return p.account_type === "superadmin" || p.account_type === "admin";
  } catch {
    return false;
  }
}

const ALLOWED_RANGES: readonly VisitRange[] = ["7d", "30d", "all"];

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rangeParam = request.nextUrl.searchParams.get("range");
  let range: VisitRange = "30d";
  if (rangeParam && ALLOWED_RANGES.includes(rangeParam as VisitRange)) {
    range = rangeParam as VisitRange;
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query<VisitRow>(
      `SELECT page, country_code, country_name, visited_at::text
       FROM page_visits
       ORDER BY visited_at DESC`
    );

    const aggregate = aggregateVisits(rows, range, Date.now());
    return NextResponse.json(aggregate);
  } catch (err) {
    console.error("[visitors] DB error:", err);
    return NextResponse.json(
      { error: "Database unavailable", totals: { allTime: 0, last7Days: 0, last30Days: 0, today: 0 }, byCountry: [], byPage: [], daily: [], uniqueCountries: 0 },
      { status: 200 }
    );
  }
}
