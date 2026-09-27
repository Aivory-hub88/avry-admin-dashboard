import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, pickQuery, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Recorded USD -> IDR observations, for the currency-movement chart.
 *
 * `marketRate` is what the provider published; `billingRate` is what customers
 * were actually charged (market + margin). Both are plotted so the margin is
 * visible rather than implied.
 */

interface ServicePoint {
  fetched_at?: string;
  market_rate?: number;
  billing_rate?: number;
  margin_percent?: number;
  provider?: string | null;
  provider_updated_at?: string | null;
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/fx/history",
    token,
    query: pickQuery(request, ["days"]),
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json({ error: "Payments service is not configured" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to reach payments service" }, { status: 502 });
  }

  const data = result.data as { points?: ServicePoint[]; days?: number } | null;
  return NextResponse.json({
    days: data?.days ?? 30,
    points: (data?.points ?? []).map((p) => ({
      fetchedAt: p.fetched_at ?? "",
      marketRate: p.market_rate ?? 0,
      billingRate: p.billing_rate ?? 0,
      marginPercent: p.margin_percent ?? 0,
      provider: p.provider ?? "",
      providerUpdatedAt: p.provider_updated_at ?? null,
    })),
  });
}
