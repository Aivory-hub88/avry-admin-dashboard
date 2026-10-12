import { NextRequest } from "next/server";
import { getAccessToken, pickQuery, proxyDownload, unauthorized } from "@/lib/bff";

/** Promo codes as CSV, honouring the table's campaign/status filters. */
export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  return proxyDownload({
    service: "payments",
    path: "/api/v1/payments/promo/admin/export",
    token,
    query: pickQuery(request, ["campaign", "status"] as const),
  });
}
