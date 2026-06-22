/**
 * VPS Monitoring Users API — returns list of users for the user selector dropdown.
 *
 * Admin-only: validates aivory_access_token cookie.
 * Queries the backend /api/v1/admin/users endpoint to get user list.
 */
import { NextRequest, NextResponse } from "next/server";
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
  const token = request.cookies.get("aivory_access_token")?.value;
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
      return NextResponse.json({ users: [] });
    }

    const data = await res.json();
    const backendUsers = data.users || [];

    // Map to the format expected by the monitoring user selector
    const users = backendUsers.map((u: { userId: string; accountType: string }) => ({
      userId: u.userId,
      tier: u.accountType || "free",
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
