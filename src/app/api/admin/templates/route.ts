/**
 * /api/admin/templates — list + create
 *
 * Spec: admin-templates-visitors
 *   GET  — list all automation templates (any Admin_User)            (Req 3)
 *   POST — create a new automation template (any Admin_User)         (Req 4)
 *
 * Auth: requires `aivory_access_token` cookie. On missing/invalid token,
 * returns 401 and clears both auth cookies on the response (Req 18.2, 18.3).
 *
 * [SUPABASE MIGRATION] Previously queried Supabase automation_templates table.
 * Now returns empty results until backend templates endpoint is available.
 */
import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decodeJwt, getUserId, isTokenExpired } from "@/lib/jwt";
import { validateCreatePayload } from "@/lib/templates";

function unauthorized(): NextResponse {
  const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  res.cookies.delete("aivory_access_token");
  res.cookies.delete("aivory_refresh_token");
  return res;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return unauthorized();
  try {
    const payload = decodeJwt(token);
    if (isTokenExpired(payload)) return unauthorized();
  } catch {
    return unauthorized();
  }

  // Fetch templates from backend
  const BACKEND_URL = process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/templates`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) ? data : data.templates ?? []);
    }
  } catch {
    // Backend not reachable
  }

  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return unauthorized();

  let userId: string | null = null;
  try {
    const payload = decodeJwt(token);
    if (isTokenExpired(payload)) return unauthorized();
    userId = getUserId(payload) || null;
  } catch {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Missing required field: name" },
      { status: 400 }
    );
  }

  const validation = validateCreatePayload(body);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // [SUPABASE MIGRATION] Previously:
  // const insertRow = { ... };
  // const { data, error } = await supabaseAdmin
  //   .from("automation_templates")
  //   .insert(insertRow)
  //   .select("*")
  //   .single();
  //
  // Returning 503 until backend templates endpoint is available.
  return NextResponse.json(
    { error: "Service temporarily unavailable — migration in progress" },
    { status: 503 }
  );
}
