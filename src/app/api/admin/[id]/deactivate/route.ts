import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, proxyToService, unauthorized } from "@/lib/bff";

/**
 * POST /api/admin/[id]/deactivate
 *
 * Deactivate or reactivate an account (superadmin only).
 *
 * This route was a leftover stub from the Supabase migration: it returned 503
 * ("migration in progress") unconditionally, so the Deactivate button in the
 * admin dashboard could never work. The backend equivalents existed the whole
 * time — this now forwards to them.
 *
 * `banDuration` comes from DeactivateModal and is either a suspension length
 * ("24h" | "7d" | "30d" | "indefinite") or the literal "reactivate", which is
 * how the modal asks for the ban to be lifted.
 */
const DURATIONS = new Set(["24h", "7d", "30d", "indefinite"]);

// DeactivateModal's radio value is "indefinitely"; the backend contract is
// "indefinite". Normalised here rather than in the modal so an older cached
// dashboard build keeps working after this deploys.
const ALIASES: Record<string, string> = {
  indefinitely: "indefinite",
  permanent: "indefinite",
  forever: "indefinite",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAccessToken(request);
  if (!token) return unauthorized();

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { banDuration?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw = (body.banDuration ?? "indefinite").trim().toLowerCase();
  const requested = ALIASES[raw] ?? raw;
  const isReactivate = requested === "reactivate";

  if (!isReactivate && !DURATIONS.has(requested)) {
    return NextResponse.json(
      { error: "banDuration must be reactivate, 24h, 7d, 30d or indefinite" },
      { status: 400 }
    );
  }

  const result = await proxyToService({
    service: "backend",
    path: `/api/v1/admin/admin-accounts/${encodeURIComponent(id)}/${
      isReactivate ? "reactivate" : "suspend"
    }`,
    method: "PATCH",
    token,
    // The reactivate endpoint takes no body; suspend carries the duration.
    body: isReactivate ? undefined : { duration: requested },
  });

  if (result.status === 401) return unauthorized();
  if (!result.ok) {
    const detail =
      (result.data as { detail?: string } | null)?.detail ??
      `Failed to ${isReactivate ? "reactivate" : "deactivate"} account`;
    return NextResponse.json({ success: false, error: detail }, { status: result.status || 502 });
  }

  const data = (result.data ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    ...data,
    success: true,
    action: isReactivate ? "reactivated" : "deactivated",
  });
}
