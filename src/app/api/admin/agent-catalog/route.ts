import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();
  const result = await proxyToService({ service: "backend", path: "/api/v1/agent-catalog", token });
  return NextResponse.json(result.ok ? (result.data ?? []) : []);
}

export async function POST(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();
  const body = await request.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  const result = await proxyToService({ service: "backend", path: "/api/v1/agent-catalog", method: "POST", token, body });
  return NextResponse.json(result.data ?? { error: "Upstream error" }, { status: result.status || 201 });
}
