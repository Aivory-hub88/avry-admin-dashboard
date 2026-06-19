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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ ...body, id, updated_at: new Date().toISOString() });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(auth.payload)) {
    return NextResponse.json({ error: "Forbidden: superadmin only" }, { status: 403 });
  }
  const { id } = await params;
  return NextResponse.json({ success: true, deleted: id });
}
