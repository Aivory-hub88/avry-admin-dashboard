import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  accessCookieMaxAge,
  clearLandingSession,
  getRefreshToken,
  refreshSession,
  safeNextPath,
} from "@/lib/sessionRefresh";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

/** Minimal browser cookie jar + localStorage for the node test env. */
function stubBrowser(cookies: Record<string, string> = {}, storage: Record<string, string> = {}) {
  const jar = new Map(Object.entries(cookies));
  const writes: string[] = [];
  (globalThis as unknown as Record<string, unknown>).document = {
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(line: string) {
      writes.push(line);
      const [pair, ...attrs] = line.split(";").map((s) => s.trim());
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      if (attrs.some((a) => a.toLowerCase() === "max-age=0")) jar.delete(name);
      else jar.set(name, pair.slice(eq + 1));
    },
  };
  const ls = new Map(Object.entries(storage));
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => void ls.set(k, String(v)),
    removeItem: (k: string) => void ls.delete(k),
  };
  return { jar, writes, ls };
}

/** Unsigned JWT with the given exp; the client only decodes, never verifies. */
function jwt(expSecondsFromNow: number, extra: Record<string, unknown> = {}) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  return `${b64({ alg: "HS256" })}.${b64({ exp, iat: 0, email: "a@aivory.id", account_type: "admin", ...extra })}.sig`;
}

afterEach(() => {
  delete (globalThis as unknown as Record<string, unknown>).document;
  delete (globalThis as unknown as Record<string, unknown>).localStorage;
  vi.unstubAllGlobals();
});

describe("getRefreshToken", () => {
  it("prefers the admin sign-in cookie", () => {
    stubBrowser({ aivory_refresh_token: "cookie-r" }, { aivory_auth: JSON.stringify({ refresh_token: "ls-r" }) });
    expect(getRefreshToken()).toBe("cookie-r");
  });

  it("falls back to the landing's localStorage session (the landing-login admin case)", () => {
    stubBrowser({}, { aivory_auth: JSON.stringify({ access_token: "a", refresh_token: "ls-r" }) });
    expect(getRefreshToken()).toBe("ls-r");
  });

  it("returns null when neither exists or storage is garbage", () => {
    stubBrowser({}, { aivory_auth: "{not json" });
    expect(getRefreshToken()).toBeNull();
  });
});

describe("accessCookieMaxAge", () => {
  it("follows the token's own lifetime instead of a fixed hour", () => {
    expect(accessCookieMaxAge(jwt(12 * 3600))).toBeGreaterThan(11 * 3600);
    expect(accessCookieMaxAge(jwt(30 * 60))).toBeLessThanOrEqual(30 * 60);
  });

  it("never goes below a minute, and survives a broken token", () => {
    expect(accessCookieMaxAge(jwt(-10))).toBe(60);
    expect(accessCookieMaxAge("garbage")).toBe(3600);
  });
});

describe("refreshSession", () => {
  beforeEach(() => vi.useRealTimers());

  it("refreshes a landing-login admin and writes the tokens everywhere", async () => {
    const fresh = jwt(3600);
    const { jar, ls } = stubBrowser(
      { aivory_access_token: jwt(-5) },
      { aivory_auth: JSON.stringify({ access_token: "old", refresh_token: "ls-r", user: { id: "u" } }) },
    );
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: fresh, refresh_token: "r2" })));
    vi.stubGlobal("fetch", fetchMock);

    expect(await refreshSession()).toBe("refreshed");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/admin/api/auth/refresh");
    expect(JSON.parse(init.body as string)).toEqual({ refresh_token: "ls-r" });
    expect(decodeURIComponent(jar.get("aivory_access_token")!)).toBe(fresh);
    expect(decodeURIComponent(jar.get("aivory_refresh_token")!)).toBe("r2");
    const landing = JSON.parse(ls.get("aivory_auth")!);
    expect(landing).toMatchObject({ access_token: fresh, refresh_token: "r2", user: { id: "u" } });
  });

  it("distinguishes a rejected session from an outage", async () => {
    stubBrowser({ aivory_refresh_token: "r" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    expect(await refreshSession()).toBe("rejected");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    expect(await refreshSession()).toBe("unavailable");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await refreshSession()).toBe("unavailable");
  });

  it("does nothing without any refresh token", async () => {
    stubBrowser();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await refreshSession()).toBe("no-refresh-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("logout can't be undone by the silent resume", () => {
  it("clearLandingSession removes the landing's refresh token", () => {
    const { ls } = stubBrowser({}, { aivory_auth: JSON.stringify({ refresh_token: "ls-r" }) });
    clearLandingSession();
    expect(ls.has("aivory_auth")).toBe(false);
    expect(getRefreshToken()).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("keeps internal admin paths", () => {
    expect(safeNextPath("/users")).toBe("/users");
  });
  it("rejects other origins, the sign-in page and junk", () => {
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil", "/signin", "/signin?next=/x"]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});

describe("middleware sends expired sessions to sign-in with the page to return to", () => {
  it("adds next= for an expired token", () => {
    const req = new NextRequest("https://aivory.id/users", {
      headers: { cookie: `aivory_access_token=${jwt(-60)}` },
    });
    const res = middleware(req);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toMatch(/\/signin$/);
    expect(location.searchParams.get("next")).toBe("/users");
  });

  // Regression: the access-token cookie's max-age simply running out (the
  // common case — it happens every hour) makes the browser stop sending the
  // cookie at all, which is a DIFFERENT code path from "cookie present but
  // expired". That path used to redirect with no `next` at all, so a silent
  // resume always landed on the dashboard root instead of the page the
  // admin was on.
  it("adds next= when the access-token cookie is missing entirely (not just expired)", () => {
    const req = new NextRequest("https://aivory.id/users");
    const res = middleware(req);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toMatch(/\/signin$/);
    expect(location.searchParams.get("next")).toBe("/users");
  });
});
