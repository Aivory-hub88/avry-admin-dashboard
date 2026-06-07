import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  // Supabase claims
  sub?: string;
  user_metadata?: {
    account_type?: string;
    status?: string;
  };
  // Legacy flat claims
  account_type?: string;
  status?: string;
  exp: number;
}

function resolveAccountType(payload: JwtPayload): string | undefined {
  return payload.user_metadata?.account_type ?? payload.account_type;
}

function resolveStatus(payload: JwtPayload): string | undefined {
  return payload.user_metadata?.status ?? payload.status;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);
    const isExpired = payload.exp * 1000 < Date.now();

    if (isExpired) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (resolveStatus(payload) === "suspended") {
      return NextResponse.redirect(
        new URL("/login?error=account_suspended", request.url)
      );
    }

    const accountType = resolveAccountType(payload);
    const allowedRoles = ["superadmin", "admin"];
    if (!accountType || !allowedRoles.includes(accountType)) {
      return NextResponse.redirect(
        new URL("/login?error=insufficient_permissions", request.url)
      );
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// /api/track is intentionally public — do not guard.
// The visitor ingest endpoint must be reachable from the Aivory marketing site
// and product surfaces without any auth cookie. Keep this matcher scoped to
// `/dashboard/*` only so `/api/*` — including `/api/track` — is never matched.
export const config = {
  matcher: ["/dashboard/:path*"],
};
