import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Decide an out-of-band ("manual") payment.
 *
 * Customers who pay by transfer file a claim from the marketing site; it lands in
 * the ledger as `awaiting_verification` and grants nothing. Approving here is what
 * applies the entitlement — through the same idempotent grant the Midtrans
 * settlement path uses — so this route is the only way a manual payment turns into
 * access.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  let body: { action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 }
    );
  }

  const result = await proxyToService({
    service: "payments",
    path: `/api/v1/payments/manual/${encodeURIComponent(orderId)}/${body.action}`,
    method: "POST",
    token,
    body: { reason: body.reason ?? null },
  });

  if (result.status === 401) return unauthorized();
  if (result.notConfigured) {
    return NextResponse.json(
      { success: false, detail: "Payments service is not configured" },
      { status: 503 }
    );
  }
  if (!result.ok) {
    const detail =
      (result.data as { detail?: string } | null)?.detail ??
      "Failed to reach payments service";
    // Pass the service's own status through where it is meaningful: 409 means the
    // order was already decided, which the UI should say rather than call an outage.
    return NextResponse.json({ success: false, detail }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
