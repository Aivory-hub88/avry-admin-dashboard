import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

/**
 * POST /api/admin/[id]/deactivate
 * Deactivate/reactivate an admin user (super admin only)
 *
 * [SUPABASE MIGRATION] Previously used supabaseAdmin.auth.admin.updateUserById
 * and supabaseAdmin.auth.admin.listUsers. Returns 503 until backend equivalent
 * is available.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [SUPABASE MIGRATION] This route relied entirely on Supabase admin API.
  // Returning 503 until the backend provides a deactivation endpoint.
  return NextResponse.json(
    { error: "Service temporarily unavailable — migration in progress" },
    { status: 503 }
  );

  // --- Original implementation (commented out) ---
  // try {
  //   const cookieStore = await cookies();
  //   const accessToken = cookieStore.get("sb-access-token")?.value;
  //
  //   if (!accessToken) {
  //     return NextResponse.json(
  //       { error: "Unauthorized: No access token" },
  //       { status: 401 }
  //     );
  //   }
  //
  //   const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  //
  //   if (!user) {
  //     return NextResponse.json(
  //       { error: "Unauthorized: Invalid token" },
  //       { status: 401 }
  //     );
  //   }
  //
  //   const accountType = user.user_metadata?.account_type;
  //
  //   if (accountType !== "superadmin") {
  //     return NextResponse.json(
  //       { error: "Forbidden: Only super admins can deactivate admins" },
  //       { status: 403 }
  //     );
  //   }
  //
  //   const body = await request.json();
  //   const { banDuration } = body;
  //   const id = await params;
  //
  //   const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  //
  //   if (listError) {
  //     return NextResponse.json(
  //       { error: "Failed to fetch admin users" },
  //       { status: 500 }
  //     );
  //   }
  //
  //   const targetUser = users?.find((u: any) => u.id === id);
  //
  //   if (!targetUser) {
  //     return NextResponse.json(
  //       { error: "Admin user not found" },
  //       { status: 404 }
  //     );
  //   }
  //
  //   if (targetUser.id === user.id) {
  //     return NextResponse.json(
  //       { error: "Cannot deactivate your own account" },
  //       { status: 400 }
  //     );
  //   }
  //
  //   const targetAccountType = targetUser.user_metadata?.account_type;
  //   if (targetAccountType === "superadmin") {
  //     return NextResponse.json(
  //       { error: "Cannot deactivate super admin accounts" },
  //       { status: 403 }
  //     );
  //   }
  //
  //   const updateData: any = {
  //     user_metadata: {
  //       ...targetUser.user_metadata,
  //       ban_duration: banDuration && banDuration !== "reactivate" ? banDuration : null,
  //     },
  //   };
  //
  //   const { data: updatedUser, error: updateError } =
  //     await (supabaseAdmin.auth.admin as any).updateUserById(id, updateData);
  //
  //   if (updateError) {
  //     console.error("Error updating admin status:", updateError);
  //     return NextResponse.json(
  //       { error: "Failed to update admin status" },
  //       { status: 500 }
  //     );
  //   }
  //
  //   return NextResponse.json({
  //     success: true,
  //     user: {
  //       id: updatedUser.user.id,
  //       email: updatedUser.user.email,
  //       banned_at: updatedUser.user.banned_at,
  //       ban_duration: updatedUser.user.user_metadata?.ban_duration,
  //     },
  //     action: banDuration === "reactivate" ? "reactivated" : "deactivated",
  //   });
  // } catch (error) {
  //   console.error("Unexpected error in deactivate admin:", error);
  //   return NextResponse.json(
  //     { error: "Internal server error" },
  //     { status: 500 }
  //   );
  // }
}
