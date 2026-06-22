import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

export async function POST(request: NextRequest) {
  let body: { refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { refresh_token } = body;
  if (!refresh_token) {
    return NextResponse.json(
      { error: "refresh_token is required" },
      { status: 400 }
    );
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: "Failed to refresh session" },
        { status: 401 }
      );
    }

    const data = await backendRes.json();
    const tokens = data.tokens || data;

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refresh_token,
      token_type: "bearer",
    });
  } catch (err) {
    console.error("[admin/auth/refresh] Backend error:", err);
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}
