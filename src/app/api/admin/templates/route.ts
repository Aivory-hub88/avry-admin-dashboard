import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

// GET /api/admin/templates — all templates (draft + active) from backend
export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();
  const result = await proxyToService({ service: "backend", path: "/api/v1/templates", token });
  return NextResponse.json(result.ok ? (result.data ?? []) : []);
}

// POST /api/admin/templates — create a template
export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();
  const body = await request.json().catch(() => ({}));
  if (!body.name) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  }
  const result = await proxyToService({ service: "backend", path: "/api/v1/templates", method: "POST", token, body });
  return NextResponse.json(result.data ?? { error: "Upstream error" }, { status: result.status || 201 });
}
