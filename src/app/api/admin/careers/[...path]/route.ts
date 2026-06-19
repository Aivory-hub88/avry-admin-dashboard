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

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await params;
  const subPath = "/api/admin/" + path.join("/");
  const url = `${CAREERS_URL}${subPath}`;

  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const init: RequestInit = { method: request.method, headers };

    if (request.method !== "GET" && request.method !== "HEAD") {
      headers["Content-Type"] = "application/json";
      const body = await request.text();
      if (body) init.body = body;
    }

    const res = await fetch(url, init);
    
    // Handle binary responses (CV downloads)
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/pdf") || contentType.includes("octet-stream")) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: { "Content-Type": contentType },
      });
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { success: true }, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "Careers service unavailable" }, { status: 503 });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
