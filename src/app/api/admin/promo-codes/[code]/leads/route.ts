import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/** The customers behind one promo code, each at the furthest stage they reached. */

interface ServiceLead {
  user_id: string;
  email: string | null;
  stage: "applied" | "checkout" | "paid";
  product: string | null;
  amount_usd: number | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { code } = await params;
  const result = await proxyToService({
    service: "payments",
    path: `/api/v1/payments/promo/admin/${encodeURIComponent(code)}/leads`,
    token,
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 404 ? "Unknown promo code" : "Failed to load leads" },
      { status: result.status === 404 ? 404 : 502 }
    );
  }

  const data = result.data as { leads?: ServiceLead[] } | null;
  return NextResponse.json({
    code,
    leads: (data?.leads ?? []).map((l) => ({
      userId: l.user_id,
      email: l.email,
      stage: l.stage,
      product: l.product,
      amountUsd: l.amount_usd,
      firstSeenAt: l.first_seen_at,
      lastSeenAt: l.last_seen_at,
    })),
  });
}
