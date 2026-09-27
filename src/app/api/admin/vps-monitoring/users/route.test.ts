/**
 * Unit tests for the migrated VPS Monitoring Users endpoint.
 *
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * The endpoint queries the backend at GET /api/v1/admin/users (with the
 * caller's admin token) and returns sorted { userId, tier }[] for admin
 * users. It moved there from the VPS Panel API in 2aa5edf; these tests
 * follow the route as deployed. Upstream failures are reported (502 / 503),
 * never shown as an empty list.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── JWT Token Helpers ──────────────────────────────────────────────────────

function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode(header)}.${encode(payload)}.mock-signature`;
}

function adminToken(overrides: Record<string, unknown> = {}): string {
  return createMockJwt({
    sub: "admin-user-id-123",
    email: "admin@aivory.id",
    account_type: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  });
}

function superadminToken(): string {
  return createMockJwt({
    sub: "superadmin-user-id-001",
    email: "grandmaster@aivory.ai",
    account_type: "superadmin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
}

function regularUserToken(): string {
  return createMockJwt({
    sub: "regular-user-id",
    email: "user@example.com",
    account_type: "free",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
}

function expiredAdminToken(): string {
  return createMockJwt({
    sub: "admin-user-id",
    email: "admin@aivory.id",
    account_type: "admin",
    exp: Math.floor(Date.now() / 1000) - 3600,
    iat: Math.floor(Date.now() / 1000) - 7200,
  });
}

// ─── Request Factory ────────────────────────────────────────────────────────

function createUsersRequest(token?: string): NextRequest {
  const request = new NextRequest(
    "http://localhost:9002/api/admin/vps-monitoring/users"
  );
  if (token) {
    request.cookies.set("aivory_access_token", token);
  }
  return request;
}

// ─── Backend Response Factory ───────────────────────────────────────────────

function backendUsersResponse(
  users: Array<{ userId: string; accountType?: string; email?: string }>
): Response {
  return new Response(JSON.stringify({ users }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadGET() {
  const { GET } = await import("@/app/api/admin/vps-monitoring/users/route");
  return GET;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("VPS Monitoring Users Endpoint — Unit Tests", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  describe("Authorization", () => {
    it("returns 401 when no cookie is present", async () => {
      const response = await (await loadGET())(createUsersRequest());
      expect(response.status).toBe(401);
      expect((await response.json()).error).toBe("Unauthorized");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns 401 when token is expired", async () => {
      const response = await (await loadGET())(createUsersRequest(expiredAdminToken()));
      expect(response.status).toBe(401);
    });

    it("returns 401 for non-admin user (free tier)", async () => {
      const response = await (await loadGET())(createUsersRequest(regularUserToken()));
      expect(response.status).toBe(401);
    });

    it("returns 401 for malformed token", async () => {
      const response = await (await loadGET())(createUsersRequest("not-a-jwt"));
      expect(response.status).toBe(401);
    });

    it("accepts superadmin", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(backendUsersResponse([]));
      const response = await (await loadGET())(createUsersRequest(superadminToken()));
      expect(response.status).toBe(200);
    });
  });

  describe("Successful response", () => {
    it("returns users sorted by userId, with accountType mapped to tier", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        backendUsersResponse([
          { userId: "user-c", accountType: "enterprise", email: "c@x.id" },
          { userId: "user-a", accountType: "free" },
          { userId: "user-b", accountType: "blueprint" },
        ])
      );
      const response = await (await loadGET())(createUsersRequest(adminToken()));
      expect(response.status).toBe(200);
      expect((await response.json()).users).toEqual([
        { userId: "user-a", tier: "free" },
        { userId: "user-b", tier: "blueprint" },
        { userId: "user-c", tier: "enterprise" },
      ]);
    });

    it("defaults a missing accountType to free and drops rows without a userId", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        backendUsersResponse([{ userId: "u1" }, { userId: "" }, { email: "x" } as never])
      );
      const response = await (await loadGET())(createUsersRequest(adminToken()));
      expect((await response.json()).users).toEqual([{ userId: "u1", tier: "free" }]);
    });

    it("returns an empty array when the backend has no users", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(backendUsersResponse([]));
      const response = await (await loadGET())(createUsersRequest(adminToken()));
      expect(response.status).toBe(200);
      expect((await response.json()).users).toEqual([]);
    });

    it("calls the backend admin users endpoint with the caller's token", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(backendUsersResponse([]));
      const token = adminToken();
      await (await loadGET())(createUsersRequest(token));
      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(String(url)).toMatch(/\/api\/v1\/admin\/users$/);
      expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
    });
  });

  describe("Upstream failures are reported, not hidden", () => {
    for (const status of [500, 404, 403]) {
      it(`returns 502 when the backend returns ${status}`, async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(new Response("{}", { status }));
        const response = await (await loadGET())(createUsersRequest(adminToken()));
        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body.users).toEqual([]);
        expect(body.error).toContain(String(status));
      });
    }

    it("returns 503 when the request times out", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));
      const response = await (await loadGET())(createUsersRequest(adminToken()));
      expect(response.status).toBe(503);
      expect((await response.json()).users).toEqual([]);
    });

    it("returns 503 on network failure", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed: ECONNREFUSED"));
      const response = await (await loadGET())(createUsersRequest(adminToken()));
      expect(response.status).toBe(503);
    });
  });
});
