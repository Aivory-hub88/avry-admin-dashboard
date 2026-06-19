/**
 * /api/track — public visitor ingest endpoint.
 *
 * Writes visit data directly to PostgreSQL (page_visits table).
 * PUBLIC: No auth required. CORS enabled for all origins.
 */
import { NextRequest, NextResponse } from "next/server";
import { countryName } from "@/lib/countryName";
import { Pool } from "pg";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Lazy-init PG pool (reused across requests in the same process)
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

function corsJson(body: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: CORS_HEADERS,
  });
}

function normalizeHeader(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "page is required" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return corsJson({ error: "page is required" }, { status: 400 });
  }
  const obj = body as Record<string, unknown>;
  const page = obj.page;
  if (typeof page !== "string" || page.length === 0) {
    return corsJson({ error: "page is required" }, { status: 400 });
  }

  const referrer =
    typeof obj.referrer === "string" && obj.referrer.length > 0 ? obj.referrer : null;
  const user_agent =
    typeof obj.user_agent === "string" && obj.user_agent.length > 0 ? obj.user_agent : null;

  // Geo headers (works with Vercel, Cloudflare, or custom proxy headers)
  const country_code =
    normalizeHeader(request.headers.get("x-vercel-ip-country")) ||
    normalizeHeader(request.headers.get("cf-ipcountry"));
  const city = normalizeHeader(request.headers.get("x-vercel-ip-city"));
  const country_name_val = country_code ? countryName(country_code) : null;

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO page_visits (page, country_code, country_name, city, referrer, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [page, country_code, country_name_val, city, referrer, user_agent]
    );
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[track] DB error:", err);
    return corsJson({ error: "Internal error" }, { status: 500 });
  }
}
