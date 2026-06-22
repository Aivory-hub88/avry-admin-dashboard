import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, unauthorized, proxyToService } from "@/lib/bff";

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "20";
  const offset = searchParams.get("offset") ?? "0";

  const result = await proxyToService({
    service: "backend",
    path: "/api/v1/impersonation/history",
    method: "GET",
    token,
    query: { limit, offset },
  });

  if (result.notConfigured || result.unreachable) {
    // Return empty state when backend is unavailable
    return NextResponse.json({ sessions: [], total: 0 });
  }

  if (result.status === 401) return unauthorized();

  // Backend returns a plain array — wrap it for the frontend
  const sessions = Array.isArray(result.data) ? result.data : (result.data as { sessions?: unknown[] })?.sessions ?? [];
  const total = Array.isArray(result.data) ? (result.data as unknown[]).length : (result.data as { total?: number })?.total ?? sessions.length;

  return NextResponse.json({ sessions, total });
}
