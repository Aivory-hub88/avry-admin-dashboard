/**
 * One-time utility route: set account_type and full_name on a user.
 *
 * [SUPABASE MIGRATION] Previously used supabaseAdmin.auth.admin.updateUserById.
 * This utility route is no longer functional during migration. Returns 503.
 */
import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  // [SUPABASE MIGRATION] This route relied entirely on Supabase admin API
  // to update user metadata. The VPS backend manages user metadata directly now.
  return NextResponse.json(
    { error: "Service temporarily unavailable — migration in progress" },
    { status: 503 }
  );

  // --- Original implementation (commented out) ---
  // const setupSecret = process.env.SETUP_SECRET;
  // if (!setupSecret) {
  //   return NextResponse.json(
  //     { error: "SETUP_SECRET is not configured on this server." },
  //     { status: 500 }
  //   );
  // }
  //
  // const providedSecret = request.headers.get("x-setup-secret");
  // if (!providedSecret || providedSecret !== setupSecret) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  //
  // let body: { userId?: string; accountType?: string; fullName?: string };
  // try {
  //   body = await request.json();
  // } catch {
  //   return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  // }
  //
  // const { userId, accountType, fullName } = body;
  //
  // if (!userId || !accountType) {
  //   return NextResponse.json(
  //     { error: "userId and accountType are required" },
  //     { status: 400 }
  //   );
  // }
  //
  // if (!["superadmin", "admin"].includes(accountType)) {
  //   return NextResponse.json(
  //     { error: "accountType must be 'superadmin' or 'admin'" },
  //     { status: 400 }
  //   );
  // }
  //
  // const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
  //   userId,
  //   {
  //     user_metadata: {
  //       account_type: accountType,
  //       ...(fullName ? { full_name: fullName } : {}),
  //     },
  //   }
  // );
  //
  // if (error) {
  //   return NextResponse.json({ error: error.message }, { status: 500 });
  // }
  //
  // return NextResponse.json({
  //   success: true,
  //   userId: data.user.id,
  //   email: data.user.email,
  //   user_metadata: data.user.user_metadata,
  // });
}
