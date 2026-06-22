import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

/**
 * GET /api/admin/list
 * List all admin users (admin and super admin access)
 *
 * [SUPABASE MIGRATION] Previously used supabaseAdmin.auth.admin.listUsers.
 * Now forwards to backend service GET /api/v1/admin/admin-accounts.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Get auth token from cookies
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("aivory_access_token")?.value ||
      cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized: No access token" },
        { status: 401 }
      );
    }

    // 2. Forward to backend service
    const backendRes = await fetch(
      `${BACKEND_URL}/api/v1/admin/admin-accounts`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || "Failed to fetch admin users" },
        { status: backendRes.status }
      );
    }

    // Backend may return the list directly or wrapped; normalize to expected shape
    const admins = Array.isArray(data) ? data : data.admins || [];
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
