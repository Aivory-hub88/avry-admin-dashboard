import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

type ResetMode = "email" | "set" | "generate";

/**
 * Reset any user's password.
 *
 * Counterpart of the admin-accounts route, which only ever covered admin and
 * demo accounts — a regular customer locked out had no path at all.
 *
 * Three modes, all resolved by avry-backend:
 *   - `email`    (default) mail the user a one-time reset link, set nothing
 *   - `set`      apply the supplied password
 *   - `generate` mint a strong password and return it once
 *
 * The privilege rules (superadmin-only for admin targets, no self-reset) live in
 * the backend; this route forwards and passes the status through so a 403 reads
 * as "not allowed" rather than "something broke".
 */
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

  let body: { mode?: string; password?: string; clearUsageData?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // No body means the default: email the user a reset link.
    body = {};
  }

  const mode = (body.mode ?? (body.password ? "set" : "email")) as ResetMode;
  if (!["email", "set", "generate"].includes(mode)) {
    return NextResponse.json(
      { error: "mode must be one of: email, set, generate" },
      { status: 400 }
    );
  }
  if (mode === "set" && !body.password) {
    return NextResponse.json(
      { error: "password is required when mode is 'set'" },
      { status: 400 }
    );
  }

  const clearUsageData = Boolean(body.clearUsageData);

  const result = await proxyToService({
    service: "backend",
    path: `/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`,
    method: "POST",
    token,
    // Only forward the password on the mode that uses it, so a stray field
    // can never put a plaintext secret on the wire for an email-link reset.
    // The backend re-checks clearUsageData is only honoured for demo
    // accounts — forwarding it unconditionally here is safe either way.
    body: {
      ...(mode === "set" ? { mode, password: body.password } : { mode }),
      ...(clearUsageData ? { clearUsageData: true } : {}),
    },
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    const detail =
      (result.data as { detail?: string } | null)?.detail ??
      "Failed to reset password";
    return NextResponse.json({ success: false, detail }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
