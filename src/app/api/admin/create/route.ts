import { NextRequest, NextResponse } from "next/server";
// [SUPABASE MIGRATION] import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

/**
 * POST /api/admin/create
 * Create a new admin user (super admin only)
 *
 * [SUPABASE MIGRATION] Previously used supabaseAdmin.auth.admin.createUser.
 * Now forwards to backend service POST /api/v1/admin/admin-accounts.
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    const body = await request.json();

    // 3. Forward to backend service
    const backendRes = await fetch(
      `${BACKEND_URL}/api/v1/admin/admin-accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || "Failed to create admin user" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error in create admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// [SUPABASE MIGRATION] The following helper functions were used for local
// password validation when creating users via Supabase. Now the backend
// handles validation, but we keep them commented out for reference.

// function generateStrongPassword(): string { ... }
// function validatePassword(password: string): { valid: boolean; message?: string } { ... }
