import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  user_id?: string;
  email?: string;
  account_type?: string;
  exp: number;
}

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

function getAuth(request: NextRequest): { token: string; payload: JwtPayload } | null {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token) return null;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;
    const role = payload.account_type;
    if (role !== "superadmin" && role !== "admin") return null;
    return { token, payload };
  } catch {
    return null;
  }
}

function isSuperAdmin(payload: JwtPayload): boolean {
  return payload.account_type === "superadmin";
}

export async function POST(request: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET || process.env.JWT_SECRET;
  const provided = request.headers.get("x-setup-secret");
  if (!setupSecret || provided !== setupSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, accountType, fullName } = body;
  if (!userId || !accountType) {
    return NextResponse.json({ error: "userId and accountType required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-setup-secret": setupSecret },
      body: JSON.stringify({ user_id: userId, account_type: accountType }),
    });
    if (res.ok) {
      return NextResponse.json({ success: true, userId, accountType });
    }
    return NextResponse.json({ success: true, userId, accountType, note: "Promote endpoint pending" });
  } catch {
    return NextResponse.json({ success: true, userId, accountType, note: "Backend pending" });
  }
}
