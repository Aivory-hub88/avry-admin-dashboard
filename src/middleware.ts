import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  user_id?: string;
  email?: string;
  account_type?: string;
  sub?: string;
  user_metadata?: { account_type?: string };
  exp: number;
}

function resolveAccountType(payload: JwtPayload): string | undefined {
  return payload.account_type ?? payload.user_metadata?.account_type;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — skip auth
  if (
    pathname === "/signin" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/error-")
  ) {
    return NextResponse.next();
  }

  // Skip static assets
  if (/\.(svg|png|jpg|jpeg|gif|ico|woff2?|ttf|eot|css|js|map)$/.test(pathname)) {
    return NextResponse.next();
  }

  // Require admin auth for all other paths (including "/" which is the root admin page)
  const token = request.cookies.get("aivory_access_token")?.value;

  if (!token) {
    const signinUrl = request.nextUrl.clone();
    signinUrl.pathname = "/signin";
    return NextResponse.redirect(signinUrl);
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);

    if (payload.exp * 1000 < Date.now()) {
      const signinUrl = request.nextUrl.clone();
      signinUrl.pathname = "/signin";
      return NextResponse.redirect(signinUrl);
    }

    // Legacy tokens (pre-Postgres auth migration) carry no email claim.
    // Current backend tokens always include email + full_name + username,
    // so force a fresh sign-in to replace the stale claim set instead of
    // silently rendering the dashboard with a downgraded role/identity.
    if (!payload.email) {
      const signinUrl = request.nextUrl.clone();
      signinUrl.pathname = "/signin";
      signinUrl.searchParams.set("error", "session_refresh_required");
      const res = NextResponse.redirect(signinUrl);
      res.cookies.delete("aivory_access_token");
      return res;
    }

    const accountType = resolveAccountType(payload);
    if (!accountType || !["superadmin", "admin"].includes(accountType)) {
      const signinUrl = request.nextUrl.clone();
      signinUrl.pathname = "/signin";
      signinUrl.searchParams.set("error", "insufficient_permissions");
      return NextResponse.redirect(signinUrl);
    }
  } catch {
    const signinUrl = request.nextUrl.clone();
    signinUrl.pathname = "/signin";
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}
