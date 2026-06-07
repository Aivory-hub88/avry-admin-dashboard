/**
 * /api/admin/templates — list + create
 *
 * Spec: admin-templates-visitors
 *   GET  — list all automation templates (any Admin_User)            (Req 3)
 *   POST — create a new automation template (any Admin_User)         (Req 4)
 *
 * Auth: requires `aivory_access_token` cookie. On missing/invalid token,
 * returns 401 and clears both auth cookies on the response (Req 18.2, 18.3).
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

  const { data, error } = await supabaseAdmin
    .from("automation_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
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

  const insertRow = {
    name: validation.name,
    description: validation.description ?? null,
    category: validation.category,
    tags: validation.tags ?? null,
    workflow_json: validation.workflow_json,
    status: validation.status ?? "draft",
    // `created_by` references auth.users(id); if the Aivory JWT sub is not a
    // Supabase auth user UUID, we store null rather than fail the insert.
    created_by: userId && /^[0-9a-f-]{36}$/i.test(userId) ? userId : null,
  };

  const { data, error } = await supabaseAdmin
    .from("automation_templates")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
