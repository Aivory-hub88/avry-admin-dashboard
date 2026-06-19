import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({ service: "backend", path: "/api/v1/integrations", token });
  
  if (result.ok && result.data) {
    const raw = result.data as any;
    return NextResponse.json(Array.isArray(raw) ? raw : raw?.integrations ?? []);
  }

  // Return empty - integrations will be populated when users connect them
  return NextResponse.json([]);
}
