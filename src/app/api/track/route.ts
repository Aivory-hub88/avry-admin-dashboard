/**
 * /api/track — public visitor ingest endpoint.
 *
 * Spec: admin-templates-visitors (Req 12, 18.6–18.9, 21)
 *
 * Contract:
 * - PUBLIC. No auth cookie is read. Middleware does not match this path.
 * - Accepts `{ page: string, referrer?: string, user_agent?: string }`.
 * - Derives `country_code` + `city` from Vercel geo headers, `country_name`
 *   from the `country-list` package via `countryName` helper.
 * - Returns 204 on success, 400 on missing `page`, 500 on Supabase failure.
 * - Attaches permissive CORS headers on every response.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { countryName } from "@/lib/countryName";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(
  body: unknown,
  init?: { status?: number }
): NextResponse {
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
    typeof obj.referrer === "string" && obj.referrer.length > 0
      ? obj.referrer
      : null;
  const user_agent =
    typeof obj.user_agent === "string" && obj.user_agent.length > 0
      ? obj.user_agent
      : null;

  const country_code = normalizeHeader(
    request.headers.get("x-vercel-ip-country")
  );
  const city = normalizeHeader(request.headers.get("x-vercel-ip-city"));
  const country_name = country_code ? countryName(country_code) : null;

  const { error } = await supabaseAdmin.from("page_visits").insert({
    page,
    country_code,
    country_name,
    city,
    referrer,
    user_agent,
  });

  if (error) {
    return corsJson({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
