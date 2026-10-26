import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Change one promo code: activate/deactivate it, or edit its dates and limits.
 * Only the fields sent are changed; `expiresAt: null` removes the end date.
 * Deactivating never touches paid orders.
 */
const FIELDS: Record<string, string> = {
  active: "active",
  validFrom: "valid_from",
  expiresAt: "expires_at",
  maxCustomers: "max_customers",
  maxRedemptions: "max_redemptions",
  perUserLimit: "per_user_limit",
  note: "note",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { code } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if ("active" in body && typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(FIELDS)) {
    if (from in body) payload[to] = body[from];
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  const result = await proxyToService({
    service: "payments",
    path: `/api/v1/payments/promo/admin/${encodeURIComponent(code)}`,
    method: "PATCH",
    token,
    body: payload,
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    const detail = (result.data as { detail?: unknown } | undefined)?.detail;
    return NextResponse.json(
      { error: typeof detail === "string" ? detail : "Could not update this promo code" },
      { status: result.status === 404 || result.status === 400 ? result.status : 502 }
    );
  }
  return NextResponse.json({ code, ...payload });
}
