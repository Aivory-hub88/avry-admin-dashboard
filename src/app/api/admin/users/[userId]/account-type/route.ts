import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * Change a user's account type.
 *
 * `account_type` is the claim the whole platform gates on, so the real rules live
 * in avry-backend (superadmin-only for admin grants, no self-edits). This route
 * only forwards and passes the service's status through, so a 403 reads as
 * "not allowed" rather than "something broke".
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  let body: { accountType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.accountType) {
    return NextResponse.json({ error: "accountType is required" }, { status: 400 });
  }

  const result = await proxyToService({
    service: "backend",
    path: `/api/v1/admin/users/${encodeURIComponent(userId)}/account-type`,
    method: "PATCH",
    token,
    body: { accountType: body.accountType },
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    const detail =
      (result.data as { detail?: string } | null)?.detail ??
      "Failed to change account type";
    return NextResponse.json({ success: false, detail }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
