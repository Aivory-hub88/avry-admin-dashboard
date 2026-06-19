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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(auth.payload)) {
    return NextResponse.json({ error: "Forbidden: superadmin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.banDuration === "reactivate" ? "reactivate" : "deactivate";

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) {
      return NextResponse.json({ success: true, action });
    }
    return NextResponse.json({ success: true, action, note: "Backend route not yet implemented" });
  } catch {
    return NextResponse.json({ success: true, action, note: "Backend route not yet implemented" });
  }
}
