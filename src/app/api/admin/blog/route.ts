import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const BLOG_SERVICE_URL = process.env.BLOG_SERVICE_URL || "http://avry-blog:8089";

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

  try {
    const res = await fetch(`${BLOG_SERVICE_URL}/api/admin/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Blog service error: ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/blog] Blog service error:", err);
    return NextResponse.json(
      { error: "Blog service unavailable", posts: [] },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BLOG_SERVICE_URL}/api/admin/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[admin/blog] Blog service error:", err);
    return NextResponse.json({ error: "Blog service unavailable" }, { status: 503 });
  }
}
