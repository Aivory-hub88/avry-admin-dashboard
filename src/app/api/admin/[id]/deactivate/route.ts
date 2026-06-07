import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

/**
 * POST /api/admin/[id]/deactivate
 * Deactivate/reactivate an admin user (super admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication and super admin status
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized: No access token" },
        { status: 401 }
      );
    }

    // Verify user is super admin
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    const accountType = user.user_metadata?.account_type;

    if (accountType !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Only super admins can deactivate admins" },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { banDuration } = body;
    const id = await params;

    // 3. Get target admin using auth.admin.listUsers and filter
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { error: "Failed to fetch admin users" },
        { status: 500 }
      );
    }

    const targetUser = users?.find((u: any) => u.id === id);
    
    if (!targetUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    // Prevent self-deactivation
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Prevent deactivating other super admins
    const targetAccountType = targetUser.user_metadata?.account_type;
    if (targetAccountType === "superadmin") {
      return NextResponse.json(
        { error: "Cannot deactivate super admin accounts" },
        { status: 403 }
      );
    }

    // 4. Update user ban status using auth.admin.updateUserById
    // In Supabase v2, updateUserById takes user_id as string and attributes as object
    // Ban info is stored in user_metadata
    const updateData: any = {
      user_metadata: {
        ...targetUser.user_metadata,
        ban_duration: banDuration && banDuration !== "reactivate" ? banDuration : null,
      },
    };

    const { data: updatedUser, error: updateError } =
      await (supabaseAdmin.auth.admin as any).updateUserById(id, updateData);

    if (updateError) {
      console.error("Error updating admin status:", updateError);
      return NextResponse.json(
        { error: "Failed to update admin status" },
        { status: 500 }
      );
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        banned_at: updatedUser.user.banned_at,
        ban_duration: updatedUser.user.user_metadata?.ban_duration,
      },
      action: banDuration === "reactivate" ? "reactivated" : "deactivated",
    });

  } catch (error) {
    console.error("Unexpected error in deactivate admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}