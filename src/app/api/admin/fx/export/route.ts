import { NextRequest } from "next/server";
import { getAccessToken, pickQuery, proxyDownload, unauthorized } from "@/lib/bff";

/** Currency-movement report as CSV. */
export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  return proxyDownload({
    service: "payments",
    path: "/api/v1/payments/fx/history/export",
    token,
    query: pickQuery(request, ["days"]),
  });
}
