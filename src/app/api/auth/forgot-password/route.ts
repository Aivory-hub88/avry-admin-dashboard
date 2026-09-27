import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

/**
 * Start a password reset from the admin login page.
 *
 * Unauthenticated by necessity — the caller is locked out. It mirrors the
 * backend's contract exactly: one fixed 200 body regardless of whether the
 * address exists, so this route can't be used to enumerate admin accounts.
 * Even a backend outage returns that same body.
 */
export async function POST(request: NextRequest) {
  const generic = {
    success: true,
    message: "If that email is registered, a reset link is on its way.",
  };

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    await fetch(`${BACKEND_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, audience: "admin" }),
    });
  } catch (err) {
    console.error("[admin/auth/forgot-password] Backend error:", err);
  }

  return NextResponse.json(generic);
}
