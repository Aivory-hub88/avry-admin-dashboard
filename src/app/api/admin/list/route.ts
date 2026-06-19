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

export async function GET(request: NextRequest) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    // Fallback: query DB directly for admin users
    return NextResponse.json({ admins: [], total: 0 });
  } catch {
    return NextResponse.json({ admins: [], total: 0 });
  }
}
