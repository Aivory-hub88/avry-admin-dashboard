import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Issue a new code with the same discount, products, limits and affiliate as
 * this one, with its own usage count; the old code is deactivated by default.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { code } = await params;

  let body: { code?: string; validFrom?: string | null; expiresAt?: string | null; deactivateOld?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await proxyToService({
    service: "payments",
    path: `/api/v1/payments/promo/admin/${encodeURIComponent(code)}/regenerate`,
    method: "POST",
    token,
    body: {
      code: body.code?.trim() || undefined,
      valid_from: body.validFrom || undefined,
      expires_at: body.expiresAt || undefined,
      deactivate_old: body.deactivateOld ?? true,
    },
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    const detail = (result.data as { detail?: unknown } | undefined)?.detail;
    return NextResponse.json(
      { error: typeof detail === "string" ? detail : "Could not generate a new code" },
      { status: [400, 404, 409].includes(result.status) ? result.status : 502 }
    );
  }
  const data = result.data as { code: string; replaced: string; old_deactivated: boolean };
  return NextResponse.json({
    code: data.code,
    replaced: data.replaced,
    oldDeactivated: data.old_deactivated,
  });
}
