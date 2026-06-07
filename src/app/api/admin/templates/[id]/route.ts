/**
 * /api/admin/templates/[id] — update + delete
 *
 * Spec: admin-templates-visitors
 *   PATCH  — update any subset of fields (any Admin_User)           (Req 5)
 *   DELETE — delete template (superadmin only — server-enforced)    (Req 6, 18.5)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const validation = validateUpdatePayload(body);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const patch = { ...validation.patch, updated_at: new Date().toISOString() };

  const { data, error } = await supabaseAdmin
    .from("automation_templates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(data);
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

  // Check the row exists first so we can return a 404 distinct from a
  // successful no-op delete (Req 6.5).
  const existing = await supabaseAdmin
    .from("automation_templates")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json(
      { error: existing.error.message },
      { status: 500 }
    );
  }
  if (!existing.data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("automation_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
