import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

/**
 * Check whether a reset link is still usable, so the page can say "this link
 * has expired" before the admin types a new password into a dead form.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/auth/reset-password/check?token=${encodeURIComponent(token)}`
    );
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { valid: false }, {
      status: res.ok ? 200 : res.status,
    });
  } catch (err) {
    console.error("[admin/auth/reset-password] Backend error:", err);
    return NextResponse.json(
      { valid: false, error: "Service unavailable" },
      { status: 503 }
    );
  }
}

/**
 * Redeem a reset link and set the new password.
 *
 * The backend drops every session for the account on success, so the admin is
 * sent back to the login page afterwards rather than straight into the
 * dashboard.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: password }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const detail =
        (data as { detail?: string } | null)?.detail ??
        "Could not reset the password";
      return NextResponse.json({ success: false, error: detail }, { status: res.status });
    }

    return NextResponse.json(data ?? { success: true });
  } catch (err) {
    console.error("[admin/auth/reset-password] Backend error:", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
