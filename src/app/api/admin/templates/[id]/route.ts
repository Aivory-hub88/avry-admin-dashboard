/**
 * /api/admin/templates/[id] — update + delete
 *
 * Spec: admin-templates-visitors
 *   PATCH  — update any subset of fields (any Admin_User)           (Req 5)
 *   DELETE — delete template (superadmin only — server-enforced)    (Req 6, 18.5)
 *
 * [SUPABASE MIGRATION] Previously queried Supabase automation_templates table.
 * Now returns 503 until backend templates endpoint is available.
 */
import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decodeJwt, getAccountType, isTokenExpired } from "@/lib/jwt";
import { validateUpdatePayload } from "@/lib/templates";

function unauthorized(): NextResponse {
  const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  res.cookies.delete("aivory_access_token");
  res.cookies.delete("aivory_refresh_token");
  return res;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return unauthorized();
  try {
    const payload = decodeJwt(token);
    if (isTokenExpired(payload)) return unauthorized();
  } catch {
    return unauthorized();
  }

  // [SUPABASE MIGRATION] Previously:
  // const { data, error } = await supabaseAdmin
  //   .from("automation_templates")
  //   .update(patch)
  //   .eq("id", id)
  //   .select("*")
  //   .maybeSingle();
  //
  // Returning 503 until backend templates endpoint is available.
  return NextResponse.json(
    { error: "Service temporarily unavailable — migration in progress" },
    { status: 503 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return unauthorized();

  // Independent server-side superadmin check (Req 6.3, 18.5).
  try {
    const payload = decodeJwt(token);
    if (isTokenExpired(payload)) return unauthorized();
    const accountType = getAccountType(payload);
    if (accountType !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: superadmin only" },
        { status: 403 }
      );
    }
  } catch {
    return unauthorized();
  }

  // [SUPABASE MIGRATION] Previously:
  // const existing = await supabaseAdmin
  //   .from("automation_templates")
  //   .select("id")
  //   .eq("id", id)
  //   .maybeSingle();
  //
  // const { error } = await supabaseAdmin
  //   .from("automation_templates")
  //   .delete()
  //   .eq("id", id);
  //
  // Returning 503 until backend templates endpoint is available.
  return NextResponse.json(
    { error: "Service temporarily unavailable — migration in progress" },
    { status: 503 }
  );
}
