/**
 * /api/track — public visitor ingest endpoint.
 *
 * Spec: admin-templates-visitors (Req 12, 18.6–18.9, 21)
 *
 * Contract:
 * - PUBLIC. No auth cookie is read. Middleware does not match this path.
 * - Accepts `{ page: string, referrer?: string, user_agent?: string }`.
 * - Returns 204 on success (no-op during migration).
 * - Attaches permissive CORS headers on every response.
 *
 * [SUPABASE MIGRATION] Previously inserted into Supabase page_visits table.
 * Now operates as a no-op (accepts requests but does not persist).
 * Will be reconnected once backend visitors ingest endpoint is available.
 */
import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
// [SUPABASE MIGRATION] import { countryName } from "@/lib/countryName";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  // [SUPABASE MIGRATION] Validate input shape to keep API contract stable,
  // but do not persist data until backend ingest endpoint is available.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "page is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "page is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  const obj = body as Record<string, unknown>;
  const page = obj.page;
  if (typeof page !== "string" || page.length === 0) {
    return NextResponse.json(
      { error: "page is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // [SUPABASE MIGRATION] Previously:
  // const { error } = await supabaseAdmin.from("page_visits").insert({
  //   page, country_code, country_name, city, referrer, user_agent,
  // });
  //
  // No-op: return 204 without persisting.
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
