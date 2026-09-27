/**
 * One place that keeps an admin session alive, whichever way it was started.
 *
 * Admins sign in two ways, and they leave the refresh token in different places:
 *   - /admin/signin (SignInForm) sets the `aivory_refresh_token` cookie;
 *   - the landing (aivory.id login, same host) keeps it in localStorage
 *     `aivory_auth` and never sets that cookie.
 * useTokenRefresh used to read the cookie only, so a landing-login admin could
 * never refresh and was sent to /signin as soon as the access token ran out.
 *
 * The access-token cookie also used a hard-coded max-age of 3600. With 12-hour
 * tokens the cookie vanished after an hour while the token was still good,
 * before the "expiring soon" check could ever fire, so /admin/signin admins
 * were logged out hourly too. Cookies now live exactly as long as the token.
 */
import { getCookie, setCookie } from "@/lib/cookies";
import { decodeJwt } from "@/lib/jwt";
import { bffFetch } from "@/lib/bff";

export const ACCESS_COOKIE = "aivory_access_token";
export const REFRESH_COOKIE = "aivory_refresh_token";
const LANDING_SESSION_KEY = "aivory_auth";
const REFRESH_MAX_AGE = 30 * 24 * 3600; // backend refresh sessions are 30 days

function readLandingSession(): Record<string, unknown> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LANDING_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Cookie first (admin sign-in), then the landing's localStorage session. */
export function getRefreshToken(): string | null {
  const fromCookie = getCookie(REFRESH_COOKIE);
  if (fromCookie) return fromCookie;
  const fromLanding = readLandingSession()?.refresh_token;
  return typeof fromLanding === "string" && fromLanding ? fromLanding : null;
}

/** Seconds until the token expires (at least 60), so the cookie never
 *  outlives the token or disappears before it. */
export function accessCookieMaxAge(accessToken: string, now = Date.now()): number {
  try {
    const secondsLeft = Math.floor((decodeJwt(accessToken).exp * 1000 - now) / 1000);
    return Math.max(60, secondsLeft);
  } catch {
    return 3600;
  }
}

/** Write a fresh token pair everywhere this session keeps it. */
export function storeSession(accessToken: string, refreshToken: string | null): void {
  setCookie(ACCESS_COOKIE, accessToken, {
    maxAge: accessCookieMaxAge(accessToken),
    path: "/",
    sameSite: "Lax",
  });
  if (refreshToken) {
    setCookie(REFRESH_COOKIE, refreshToken, { maxAge: REFRESH_MAX_AGE, path: "/", sameSite: "Lax" });
  }
  // Keep the landing's copy current too; otherwise the next landing visit
  // would put the old token back.
  const landing = readLandingSession();
  if (landing) {
    landing.access_token = accessToken;
    if (refreshToken) landing.refresh_token = refreshToken;
    try {
      localStorage.setItem(LANDING_SESSION_KEY, JSON.stringify(landing));
    } catch {
      // Storage full or blocked: the cookies above are what the admin reads.
    }
  }
}

export type RefreshResult = "refreshed" | "no-refresh-token" | "rejected" | "unavailable";

/**
 * Exchange the refresh token for a new access token.
 * "rejected" means the backend looked at it and said no: the session is gone.
 * "unavailable" is a network/5xx problem and says nothing about the session.
 */
export async function refreshSession(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return "no-refresh-token";
  let res: Response;
  try {
    res = await bffFetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return "unavailable";
  }
  if (res.status === 401 || res.status === 400) return "rejected";
  if (!res.ok) return "unavailable";
  const data = await res.json().catch(() => null);
  if (!data?.access_token) return "unavailable";
  storeSession(data.access_token, data.refresh_token ?? refreshToken);
  return "refreshed";
}

/** Where to go after sign-in: an internal admin path, never back to the
 *  sign-in page, never another origin ("//evil.example"). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  if (next === "/signin" || next.startsWith("/signin?") || next === "/login") return "/dashboard";
  return next;
}

/** Drop the landing's stored session (used on logout). */
export function clearLandingSession(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(LANDING_SESSION_KEY);
  } catch {
    // Blocked storage: nothing was readable to resume from either.
  }
}
