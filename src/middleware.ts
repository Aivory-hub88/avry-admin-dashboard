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
    return NextResponse.redirect(new URL("/admin/signin", request.url));
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);

    if (payload.exp * 1000 < Date.now()) {
      return NextResponse.redirect(new URL("/admin/signin", request.url));
    }

    const accountType = resolveAccountType(payload);
    if (!accountType || !["superadmin", "admin"].includes(accountType)) {
      return NextResponse.redirect(new URL("/admin/signin?error=insufficient_permissions", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/admin/signin", request.url));
  }

  return NextResponse.next();
}
