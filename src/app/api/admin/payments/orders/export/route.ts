import { NextRequest } from "next/server";
import { getAccessToken, pickQuery, proxyDownload, unauthorized } from "@/lib/bff";

/**
 * Payment list as CSV. Forwards the table's active filters so the export always
 * matches what the admin is looking at.
 */

const FORWARDED = [
  "status", "product", "user_id", "search", "date_from", "date_to",
  "include_mock", "sort_by", "sort_dir",
] as const;

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  return proxyDownload({
    service: "payments",
    path: "/api/v1/payments/admin/orders/export",
    token,
    query: pickQuery(request, FORWARDED),
  });
}
