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

/**
 * Redirect to sign-in with `next` always set, whichever of the two paths
 * below sent us here. The common case — the access-token cookie's max-age
 * simply expiring after an hour — means the cookie is entirely ABSENT
 * (`tokens.length === 0`), not present-but-invalid, so this path needs the
 * same `next` handling as the "cookie present but stale" path or a silent
 * resume always lands on the dashboard root instead of the page the admin
 * was on.
 */
function toSignin(
  request: NextRequest,
  pathname: string,
  error?: "session_refresh_required" | "insufficient_permissions"
): NextResponse {
  const signinUrl = request.nextUrl.clone();
  signinUrl.pathname = "/signin";
  signinUrl.search = "";
  // Sign-in tries a silent refresh first and comes back to this page if it
  // works, so every visitor here (not just an expired-token one) needs it.
  signinUrl.searchParams.set("next", pathname);
  if (error) signinUrl.searchParams.set("error", error);
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — skip auth
  if (
    pathname === "/signin" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    // Password reset is reachable only by someone who is locked out, so it
    // must never be gated behind the session it exists to restore.
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
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
    return toSignin(request, pathname);
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

  const error = sawLegacy
    ? "session_refresh_required"
    : sawInsufficient
      ? "insufficient_permissions"
      : undefined;
  return toSignin(request, pathname, error);
}
