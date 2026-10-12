import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/** Activate or deactivate one promo code. Deactivating never touches paid orders. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { code } = await params;

  let body: { active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
  }

  const result = await proxyToService({
    service: "payments",
    path: `/api/v1/payments/promo/admin/${encodeURIComponent(code)}`,
    method: "PATCH",
    token,
    body: { active: body.active },
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    return NextResponse.json(
      { error: "Could not update this promo code" },
      { status: result.status === 404 ? 404 : 502 }
    );
  }
  return NextResponse.json({ code, active: body.active });
}
