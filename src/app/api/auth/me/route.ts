import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import {
  AivoryJwtPayload,
  isTokenExpired,
  getAccountType,
  getFullName,
  getUserId,
} from "@/lib/jwt";

/**
 * Identity endpoint — the single source of truth for the client's session.
 *
 * The browser may hold DUPLICATE `aivory_access_token` cookies (host-only vs
 * `domain=.aivory.id`, e.g. one written by the admin sign-in form and another
 * stamped by the landing page's navbar SSO handler). Client-side
 * `document.cookie` parsing and Next's server-side cookie map can disagree on
 * which duplicate wins, so the client must never decode the cookie itself.
 * This route inspects EVERY duplicate and returns the first valid admin
 * identity, mirroring what the middleware accepts.
 */

function getAllTokenValues(request: NextRequest, name: string): string[] {
  const raw = request.headers.get("cookie") ?? "";
  const values: string[] = [];
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const v = part.slice(eq + 1).trim();
      if (v) values.push(decodeURIComponent(v));
    }
  }
  return values;
}

export async function GET(request: NextRequest) {
  const tokens = getAllTokenValues(request, "aivory_access_token");

  for (const token of tokens) {
    try {
      const payload = jwtDecode<AivoryJwtPayload>(token);
      if (isTokenExpired(payload)) continue;
      const accountType = getAccountType(payload);
      if (accountType !== "superadmin" && accountType !== "admin") continue;
      if (!payload.email) continue; // legacy token — force re-login

      const res = NextResponse.json({
        userId: getUserId(payload),
        email: payload.email,
        accountType,
        fullName:
          getFullName(payload) ?? payload.email.split("@")[0],
      });
      if (tokens.length > 1) {
        // Self-heal a poisoned cookie jar: expire the domain-wide duplicate
        // the landing page stamps, then re-assert the valid token host-only
        // so every subsequent request carries exactly one good cookie.
        res.headers.append(
          "Set-Cookie",
          "aivory_access_token=; Path=/; Domain=.aivory.id; Max-Age=0; SameSite=Lax"
        );
        res.headers.append(
          "Set-Cookie",
          `aivory_access_token=${token}; Path=/; Max-Age=3600; SameSite=Lax`
        );
      }
      return res;
    } catch {
      // undecodable duplicate — try the next one
    }
  }

  return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
}
