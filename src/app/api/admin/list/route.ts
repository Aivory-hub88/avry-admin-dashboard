import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

/**
 * GET /api/admin/list
 * List all admin users (admin and super admin access)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized: No access token" },
        { status: 401 }
      );
    }

    // Verify user is authenticated
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    const accountType = user.user_metadata?.account_type;

    // Only admins and super admins can view the list
    if (accountType !== "admin" && accountType !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // 2. List all users using auth.admin.listUsers
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return NextResponse.json(
        { error: "Failed to fetch admin users" },
        { status: 500 }
      );
    }

    // 3. Filter and transform to admin list format
    const admins = (users || [])
      .filter((u: any) => {
        const type = u.user_metadata?.account_type;
        return type === "admin" || type === "superadmin";
      })
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || "",
        account_type: u.user_metadata?.account_type || "",
        created_at: u.user_metadata?.created_at || u.created_at,
        created_by: u.user_metadata?.created_by || "",
        banned_at: u.banned_at,
        ban_duration: u.ban_duration,
        email_confirmed_at: u.email_confirmed_at,
      }));

    return NextResponse.json({
      admins,
      total: admins.length,
    });

  } catch (error) {
    console.error("Unexpected error in list admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}