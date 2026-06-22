import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

export async function POST(request: NextRequest) {
  let refreshToken = "";
  try {
    const body = await request.json();
    refreshToken = body.refresh_token || "";
  } catch {
    // ignore parse errors
  }

  // Call backend logout (best-effort)
  try {
    if (refreshToken) {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } catch {
    // ignore — clear cookies regardless
  }

  const response = NextResponse.json({ success: true });

  // Clear both auth cookies
  response.cookies.set("aivory_access_token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  response.cookies.set("aivory_refresh_token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
