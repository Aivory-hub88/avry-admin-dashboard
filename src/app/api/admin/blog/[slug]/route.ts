import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const BLOG_SERVICE_URL = process.env.BLOG_SERVICE_URL || "http://avry-blog:8089";

interface JwtPayload { account_type?: string; exp: number; }

function isAdmin(token: string): boolean {
  try {
    const p = jwtDecode<JwtPayload>(token);
    if (p.exp * 1000 < Date.now()) return false;
    return p.account_type === "superadmin" || p.account_type === "admin";
  } catch { return false; }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const body = await request.json();
    const res = await fetch(`${BLOG_SERVICE_URL}/api/admin/posts/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Blog service unavailable" }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const res = await fetch(`${BLOG_SERVICE_URL}/api/admin/posts/${slug}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return NextResponse.json({ success: true });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Blog service unavailable" }, { status: 503 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = request.cookies.get("aivory_access_token")?.value;
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  try {
    const body = await request.json();
    const res = await fetch(`${BLOG_SERVICE_URL}/api/admin/posts/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Blog service unavailable" }, { status: 503 });
  }
}
