import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

// PATCH /api/admin/templates/:id — update (proxies to backend PUT)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await proxyToService({ service: "backend", path: `/api/v1/templates/${id}`, method: "PUT", token, body });
  return NextResponse.json(result.data ?? {}, { status: result.status || 200 });
}

// DELETE /api/admin/templates/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();
  const { id } = await params;
  const result = await proxyToService({ service: "backend", path: `/api/v1/templates/${id}`, method: "DELETE", token });
  return NextResponse.json(result.data ?? { success: result.ok }, { status: result.status || 200 });
}
