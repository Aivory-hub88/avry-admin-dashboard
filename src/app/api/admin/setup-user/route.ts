/**
 * One-time utility route: set account_type and full_name on a Supabase user.
 *
 * Authentication: requires the `x-setup-secret` header to match SETUP_SECRET env var.
 * This route is server-side only — never called from the browser.
 *
 * Usage (replace PORT with your actual dev port — see README.md):
 *
 *   curl -X POST http://localhost:PORT/api/admin/setup-user \
 *     -H "Content-Type: application/json" \
 *     -H "x-setup-secret: YOUR_SETUP_SECRET" \
 *     -d '{"userId":"<supabase-uid>","accountType":"superadmin","fullName":"Irfan Reichmann"}'
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  // --- Auth check ---
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not configured on this server." },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get("x-setup-secret");
  if (!providedSecret || providedSecret !== setupSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse body ---
  let body: { userId?: string; accountType?: string; fullName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, accountType, fullName } = body;

  if (!userId || !accountType) {
    return NextResponse.json(
      { error: "userId and accountType are required" },
      { status: 400 }
    );
  }

  if (!["superadmin", "admin"].includes(accountType)) {
    return NextResponse.json(
      { error: "accountType must be 'superadmin' or 'admin'" },
      { status: 400 }
    );
  }

  // --- Update user metadata via service role ---
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        account_type: accountType,
        ...(fullName ? { full_name: fullName } : {}),
      },
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    userId: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata,
  });
}
