import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/** Lead conversion rolled up per affiliate, from the payments service. */

interface ServiceAffiliate {
  affiliate: string;
  affiliate_company: string | null;
  affiliate_names: string | null;
  affiliate_partner_id: string | null;
  codes: number;
  applied_users: number;
  checkout_users: number;
  paid_users: number;
  conversion_rate: number;
  revenue_usd: number;
  discount_given_usd: number;
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/promo/admin/affiliates",
    token,
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json({ error: "Payments service is not configured" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to reach payments service" }, { status: 502 });
  }

  const data = result.data as { affiliates?: ServiceAffiliate[] } | null;
  return NextResponse.json({
    affiliates: (data?.affiliates ?? []).map((a) => ({
      affiliate: a.affiliate,
      company: a.affiliate_company,
      names: a.affiliate_names,
      partnerId: a.affiliate_partner_id ?? null,
      codes: a.codes,
      appliedUsers: a.applied_users,
      checkoutUsers: a.checkout_users,
      paidUsers: a.paid_users,
      conversionRate: a.conversion_rate,
      revenueUsd: a.revenue_usd,
      discountGivenUsd: a.discount_given_usd,
    })),
  });
}
