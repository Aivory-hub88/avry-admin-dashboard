import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/** Mark one admin notification as read. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  const result = await proxyToService({
    service: "payments",
    path: `/api/v1/payments/admin/notifications/${id}/read`,
    method: "POST",
    token,
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    return NextResponse.json({ success: false }, { status: 502 });
  }
  return NextResponse.json(result.data);
}
