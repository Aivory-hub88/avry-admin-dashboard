/**
 * Unit tests for the migrated VPS Monitoring Users endpoint.
 *
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * The endpoint queries the VPS Panel API at
 * GET /api/monitoring/projects/avry-v2-main/users
 * and returns sorted { userId, tier }[] for admin users.
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

// ─── VPS Panel Response Factory ─────────────────────────────────────────────

function vpsPanelSuccessResponse(
  data: Array<{ userId: string; tier: string }>
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("VPS Monitoring Users Endpoint — Unit Tests", () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    originalEnv = process.env.VPS_PANEL_API_TOKEN;
    process.env.VPS_PANEL_API_TOKEN = "test-api-token-123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.VPS_PANEL_API_TOKEN = originalEnv;
    vi.resetModules();
  });

  // ─── Authorization Tests (Requirement 1.5) ─────────────────────────────

  describe("Authorization", () => {
    it("returns 401 when no cookie is present", async () => {
      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest();
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when token is expired", async () => {
      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(expiredAdminToken());
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 for non-admin user (free tier)", async () => {
      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(regularUserToken());
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 for malformed token", async () => {
      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest("not-a-valid-jwt");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // ─── Missing Config (Requirement 1.5) ──────────────────────────────────

  describe("Missing VPS_PANEL_API_TOKEN", () => {
    it("returns 503 when VPS_PANEL_API_TOKEN is not set", async () => {
      delete process.env.VPS_PANEL_API_TOKEN;

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe("Monitoring service unavailable");
      expect(body.users).toEqual([]);
    });

    it("returns 503 when VPS_PANEL_API_TOKEN is empty string", async () => {
      process.env.VPS_PANEL_API_TOKEN = "";

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe("Monitoring service unavailable");
      expect(body.users).toEqual([]);
    });
  });

  // ─── Successful Response (Requirements 1.1, 1.2) ──────────────────────

  describe("Successful response", () => {
    it("returns sorted users array from VPS Panel API", async () => {
      const mockUsers = [
        { userId: "zulu-user", tier: "free" },
        { userId: "alpha-user", tier: "paid" },
        { userId: "mike-user", tier: "enterprise" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        vpsPanelSuccessResponse(mockUsers)
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toHaveLength(3);
      // Verify alphabetical sorting by userId
      expect(body.users[0].userId).toBe("alpha-user");
      expect(body.users[1].userId).toBe("mike-user");
      expect(body.users[2].userId).toBe("zulu-user");
    });

    it("preserves userId and tier fields exactly", async () => {
      const mockUsers = [{ userId: "user-abc", tier: "paid" }];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        vpsPanelSuccessResponse(mockUsers)
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(superadminToken());
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toEqual([{ userId: "user-abc", tier: "paid" }]);
    });

    it("returns empty array when VPS Panel returns empty data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        vpsPanelSuccessResponse([])
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toEqual([]);
    });

    it("calls VPS Panel with correct URL and authorization header", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        vpsPanelSuccessResponse([])
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://vps-panel:3000/api/monitoring/projects/avry-v2-main/users",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-token-123",
            Accept: "application/json",
          }),
        })
      );
    });
  });

  // ─── Upstream Error Handling (Requirement 1.3) ─────────────────────────

  describe("Upstream non-2xx responses", () => {
    it("returns 502 when VPS Panel returns 500", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 500 })
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error).toBe("Failed to query monitoring service");
      expect(body.users).toEqual([]);
    });

    it("returns 502 when VPS Panel returns 404", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response("Not Found", { status: 404 })
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error).toBe("Failed to query monitoring service");
      expect(body.users).toEqual([]);
    });

    it("returns 502 when VPS Panel returns 403", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response("Forbidden", { status: 403 })
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error).toBe("Failed to query monitoring service");
      expect(body.users).toEqual([]);
    });
  });

  // ─── Timeout Handling (Requirement 1.4) ────────────────────────────────

  describe("Timeout and network failures", () => {
    it("returns 503 when request times out", async () => {
      const timeoutError = new DOMException(
        "The operation was aborted due to timeout",
        "TimeoutError"
      );

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        timeoutError
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBeTruthy();
      expect(body.users).toEqual([]);
    });

    it("returns 503 on network failure (connection refused)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError("fetch failed")
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBeTruthy();
      expect(body.users).toEqual([]);
    });

    it("returns 503 on DNS resolution failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("getaddrinfo ENOTFOUND vps-panel")
      );

      const { GET } = await import(
        "@/app/api/admin/vps-monitoring/users/route"
      );
      const request = createUsersRequest(adminToken());
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toContain("getaddrinfo ENOTFOUND vps-panel");
      expect(body.users).toEqual([]);
    });
  });
});
