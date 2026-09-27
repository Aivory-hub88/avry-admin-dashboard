/**
 * VPS Monitoring Users API — returns list of users for the user selector dropdown.
 *
 * Admin-only: validates aivory_access_token cookie.
 * Queries the backend /api/v1/admin/users endpoint to get user list.
 *
 * Upstream failures are reported, not hidden: a backend error is 502 and an
 * unreachable/timed-out backend is 503 (both with `users: []` and an
 * `error`), so the selector can say "couldn't load users" instead of
 * showing an empty list that looks like "no users exist".
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/bff";
import { jwtDecode } from "jwt-decode";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  user_metadata?: { account_type?: string };
  app_metadata?: { account_type?: string };
  account_type?: string;
  exp: number;
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

function resolveAccountType(payload: JwtPayload): string | undefined {
  return (
    payload.user_metadata?.account_type ??
    payload.app_metadata?.account_type ??
    payload.account_type
  );
}

function validateAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return false;
    const accountType = resolveAccountType(payload);
    return !!accountType && ["superadmin", "admin"].includes(accountType);
  } catch {
    return false;
  }
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || "http://avry-backend:8081";

export async function GET(request: NextRequest) {
  const token = getAccessToken(request) ?? undefined;
  if (!validateAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch users from the backend
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { users: [], error: `Backend returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const backendUsers: { userId?: string; accountType?: string }[] = Array.isArray(data?.users)
      ? data.users
      : [];

    // Map to the format expected by the monitoring user selector, sorted so
    // the dropdown order is stable between loads.
    const users = backendUsers
      .filter((u) => typeof u.userId === "string" && u.userId !== "")
      .map((u) => ({ userId: u.userId as string, tier: u.accountType || "free" }))
      .sort((a, b) => a.userId.localeCompare(b.userId));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { users: [], error: "Backend unreachable" },
      { status: 503 }
    );
  }
}
