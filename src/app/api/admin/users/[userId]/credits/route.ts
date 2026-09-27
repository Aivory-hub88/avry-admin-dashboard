import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Read or adjust one user's credit balance.
 *
 * Adjustments are recorded in `billing.credit_ledger` with the acting admin, so
 * `delta` (relative) and `setBalance` (absolute) are both audited. Exactly one of
 * the two is accepted — the service rejects a request carrying both.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { userId } = await params;
  const result = await proxyToService({
    service: "backend",
    path: `/api/v1/credits/admin/${encodeURIComponent(userId)}`,
    token,
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to read credit balance" },
      { status: result.status || 502 }
    );
  }

  return NextResponse.json(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  let body: { delta?: number; setBalance?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const hasDelta = typeof body.delta === "number" && Number.isFinite(body.delta);
  const hasSet = typeof body.setBalance === "number" && Number.isFinite(body.setBalance);
  if (hasDelta === hasSet) {
    return NextResponse.json(
      { error: "Provide exactly one of 'delta' or 'setBalance'" },
      { status: 400 }
    );
  }

  const result = await proxyToService({
    service: "backend",
    path: "/api/v1/credits/admin/adjust",
    method: "POST",
    token,
    body: {
      user_id: userId,
      ...(hasDelta ? { delta: Math.trunc(body.delta as number) } : {}),
      ...(hasSet ? { set_balance: Math.trunc(body.setBalance as number) } : {}),
      note: body.note ?? null,
    },
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    const detail =
      (result.data as { detail?: string } | null)?.detail ?? "Failed to adjust credits";
    return NextResponse.json({ success: false, detail }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
