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

  // Require admin auth for all other paths (including "/" which is the root
  // admin page). The browser may send DUPLICATE `aivory_access_token` cookies
  // (host-only vs domain=.aivory.id — the landing navbar stamps the latter
  // from stale localStorage), so parse the raw header and accept the request
  // if ANY duplicate is a valid, current admin token. Legacy tokens (no email
  // claim — pre-Postgres-migration) never count as valid.
  const rawCookies = request.headers.get("cookie") ?? "";
  const tokens: string[] = [];
  for (const part of rawCookies.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === "aivory_access_token") {
      const v = part.slice(eq + 1).trim();
      if (v) tokens.push(decodeURIComponent(v));
    }
  }

  if (tokens.length === 0) {
    const signinUrl = request.nextUrl.clone();
    signinUrl.pathname = "/signin";
    return NextResponse.redirect(signinUrl);
  }

  let sawLegacy = false;
  let sawInsufficient = false;
  for (const token of tokens) {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (payload.exp * 1000 < Date.now()) continue;
      if (!payload.email) {
        sawLegacy = true;
        continue;
      }
      const accountType = resolveAccountType(payload);
      if (!accountType || !["superadmin", "admin"].includes(accountType)) {
        sawInsufficient = true;
        continue;
      }
      // Valid admin token found among the duplicates — allow.
      return NextResponse.next();
    } catch {
      // undecodable duplicate — try the next one
    }
  }

  const signinUrl = request.nextUrl.clone();
  signinUrl.pathname = "/signin";
  if (sawLegacy) {
    signinUrl.searchParams.set("error", "session_refresh_required");
  } else if (sawInsufficient) {
    signinUrl.searchParams.set("error", "insufficient_permissions");
  }
  const res = NextResponse.redirect(signinUrl);
  // Expire both cookie variants so stale duplicates can't keep bouncing us.
  res.headers.append(
    "Set-Cookie",
    "aivory_access_token=; Path=/; Max-Age=0; SameSite=Lax"
  );
  res.headers.append(
    "Set-Cookie",
    "aivory_access_token=; Path=/; Domain=.aivory.id; Max-Age=0; SameSite=Lax"
  );
  return res;
}
