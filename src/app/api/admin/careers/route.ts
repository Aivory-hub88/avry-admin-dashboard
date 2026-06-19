import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const CAREERS_URL = process.env.CAREERS_SERVICE_URL || "http://avry-careers:8090";
interface JwtPayload { account_type?: string; exp: number; }

function isAdmin(token: string): boolean {
  try {
    const p = jwtDecode<JwtPayload>(token);
    if (p.exp * 1000 < Date.now()) return false;
    return p.account_type === "superadmin" || p.account_type === "admin";
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [vacRes, appRes] = await Promise.all([
      fetch(`${CAREERS_URL}/api/api/admin/vacancies`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${CAREERS_URL}/api/api/admin/applications`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const vacancies = vacRes.ok ? await vacRes.json() : [];
    const applications = appRes.ok ? await appRes.json() : [];
    return NextResponse.json({ vacancies, applications });
  } catch {
    return NextResponse.json({ vacancies: [], applications: [] });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  try {
    const res = await fetch(`${CAREERS_URL}/api/api/admin/vacancies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Careers service unavailable" }, { status: 503 });
  }
}
