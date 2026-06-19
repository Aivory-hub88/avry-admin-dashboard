import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  account_type?: string;
  user_metadata?: { account_type?: string };
  exp: number;
}

function isAdmin(token: string): boolean {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return false;
    const role = payload.account_type ?? payload.user_metadata?.account_type;
    return role === "superadmin" || role === "admin";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return mock user list for now — real implementation would query backend
  return NextResponse.json({
    users: [],
    message: "VPS user monitoring not yet connected to backend service",
  });
}
