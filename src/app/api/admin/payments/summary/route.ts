import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, pickQuery, proxyToService, unauthorized } from "@/lib/bff";

/** Headline payment totals for the admin dashboard cards. */
export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const result = await proxyToService({
    service: "payments",
    path: "/api/v1/payments/admin/summary",
    token,
    query: pickQuery(request, ["include_mock"]),
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json({ error: "Payments service is not configured" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to reach payments service" }, { status: 502 });
  }

  const d = result.data as Record<string, number> | null;
  return NextResponse.json({
    orders: d?.orders ?? 0,
    paid: d?.paid ?? 0,
    pending: d?.pending ?? 0,
    // Manual (bank transfer / cash) claims waiting on an admin decision. A queue,
    // not a fault, so it is counted apart from `problem`.
    awaitingVerification: d?.awaiting_verification ?? 0,
    problem: d?.problem ?? 0,
    revenueUsd: d?.revenue_usd ?? 0,
    revenueIdr: d?.revenue_idr ?? 0,
    // Paid orders with no recorded IDR amount (legacy imports). Surfaced so the
    // UI can qualify the IDR figure instead of appearing to under-report.
    paidWithoutIdr: d?.paid_without_idr ?? 0,
  });
}
