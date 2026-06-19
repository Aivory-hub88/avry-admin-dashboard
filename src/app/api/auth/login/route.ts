import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ACCOUNT_TYPES = ["superadmin", "admin"];

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!backendRes.ok) {
      const status = backendRes.status;
      if (status === 401 || status === 400) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: status }
      );
    }

    const data = await backendRes.json();

    const tokens = data.tokens || data;
    const user = data.user || {};
    const accountType = user.account_type || "";

    if (!ALLOWED_ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json(
        { error: "insufficient_permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: "bearer",
    });
  } catch (err) {
    console.error("[admin/auth/login] Backend error:", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
