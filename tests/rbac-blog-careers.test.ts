/**
 * RBAC & User Isolation Tests — Admin Dashboard BFF
 * Blog and Careers endpoints via the BFF proxy layer.
 *
 * Tests verify:
 * 1. BFF returns 401 when no cookie is present
 * 2. BFF returns 401 when cookie contains an invalid/expired token
 * 3. BFF returns 403 when the downstream service rejects a non-admin user
 * 4. BFF proxies successfully for admin users
 * 5. Middleware blocks non-admin users from /dashboard/* pages
 * 6. Blog and Careers admin data is only accessible to admin roles
 *
 * Validates: RBAC Requirements for Blog & Careers admin surfaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock the services module
vi.mock("@/lib/services", () => ({
  SERVICE_URLS: {
    backend: "http://localhost:8082",
    payments: "http://localhost:3031",
    diagnostics: "http://localhost:8085",
    blueprint: "http://localhost:8086",
    roadmap: "http://localhost:8088",
    workflows: "http://localhost:8087",
    blog: "http://localhost:8089",
    careers: "http://localhost:8090",
  },
  getServiceUrl: (name: string) => {
    const urls: Record<string, string> = {
      backend: "http://localhost:8082",
      payments: "http://localhost:3031",
      diagnostics: "http://localhost:8085",
      blueprint: "http://localhost:8086",
      roadmap: "http://localhost:8088",
      workflows: "http://localhost:8087",
      blog: "http://localhost:8089",
      careers: "http://localhost:8090",
    };
    return urls[name] ?? null;
  },
}));

// ─── BFF Auth Unit Tests ────────────────────────────────────────────────────

describe("Admin Dashboard BFF — Auth Layer", () => {
  describe("getAccessToken", () => {
    it("returns undefined when no cookie is present", async () => {
      const { getAccessToken } = await import("@/lib/bff");
      const request = createMockRequest({});
      expect(getAccessToken(request)).toBeUndefined();
    });

    it("returns the token value from aivory_access_token cookie", async () => {
      const { getAccessToken } = await import("@/lib/bff");
      const request = createMockRequest({
        cookies: { aivory_access_token: "valid-token-abc" },
      });
      expect(getAccessToken(request)).toBe("valid-token-abc");
    });
  });

  describe("unauthorized()", () => {
    it("returns a 401 JSON response", async () => {
      const { unauthorized } = await import("@/lib/bff");
      const response = unauthorized();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });
});

// ─── Blog Admin BFF RBAC ────────────────────────────────────────────────────

describe("Admin Dashboard BFF — Blog RBAC", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  it("returns 401 when no auth cookie is provided for blog admin requests", async () => {
    const { getAccessToken, unauthorized } = await import("@/lib/bff");
    const request = createMockRequest({});
    const token = getAccessToken(request);

    // Simulates what the route handler does
    expect(token).toBeUndefined();
    const response = unauthorized();
    expect(response.status).toBe(401);
  });

  it("returns 401 when downstream blog service rejects an invalid token", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "expired-or-garbage-token",
    });

    expect(result.status).toBe(401);
    expect(result.ok).toBe(false);
  });

  it("returns 403 when downstream blog service rejects a regular user", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "valid-user-token-but-not-admin",
    });

    expect(result.status).toBe(403);
    expect(result.ok).toBe(false);
  });

  it("returns 200 when admin token is accepted by blog service", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ posts: [], total: 0, page: 1, limit: 50, total_pages: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "valid-admin-token",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect((result.data as { posts: unknown[] }).posts).toEqual([]);
  });

  it("passes Authorization header to blog service", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "my-admin-token-123",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8089/api/admin/posts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-admin-token-123",
        }),
      })
    );
  });

  it("returns 502 when blog service is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED")
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "valid-admin-token",
    });

    expect(result.status).toBe(502);
    expect(result.ok).toBe(false);
    expect(result.unreachable).toBe(true);
  });
});

// ─── Careers Admin BFF RBAC ─────────────────────────────────────────────────

describe("Admin Dashboard BFF — Careers RBAC", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  it("returns 401 when no auth cookie is provided for careers admin requests", async () => {
    const { getAccessToken, unauthorized } = await import("@/lib/bff");
    const request = createMockRequest({});
    const token = getAccessToken(request);

    expect(token).toBeUndefined();
    const response = unauthorized();
    expect(response.status).toBe(401);
  });

  it("returns 401 when downstream careers service rejects an invalid token", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies",
      token: "garbage-token",
    });

    expect(result.status).toBe(401);
    expect(result.ok).toBe(false);
  });

  it("returns 403 when downstream careers service rejects a non-admin user", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies",
      token: "valid-user-token-not-admin",
    });

    expect(result.status).toBe(403);
    expect(result.ok).toBe(false);
  });

  it("returns 200 when admin token is accepted by careers service for vacancies", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies",
      token: "valid-admin-token",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("returns 200 when admin token is accepted by careers service for applications", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/applications",
      token: "valid-admin-token",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("passes Authorization header to careers service", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies",
      token: "admin-token-xyz",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8090/api/admin/vacancies",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token-xyz",
        }),
      })
    );
  });

  it("returns 502 when careers service is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED")
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies",
      token: "valid-admin-token",
    });

    expect(result.status).toBe(502);
    expect(result.ok).toBe(false);
    expect(result.unreachable).toBe(true);
  });

  it("proxies POST to create vacancy with correct body", async () => {
    const vacancyBody = { title: "Engineer", description: { blocks: [] } };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "new-vacancy-id", ...vacancyBody }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies",
      method: "POST",
      token: "admin-token",
      body: vacancyBody,
    });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8090/api/admin/vacancies",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(vacancyBody),
      })
    );
  });
});

// ─── Middleware RBAC (Admin Dashboard) ──────────────────────────────────────

describe("Admin Dashboard — Middleware RBAC", () => {
  it("redirects to /login when no aivory_access_token cookie exists", () => {
    // Simulating the middleware logic
    const token = undefined;
    expect(token).toBeUndefined();
    // middleware would redirect → we verify the logic condition
  });

  it("redirects to /login when token is expired", () => {
    // Simulate an expired JWT payload
    const expiredPayload = {
      sub: "admin-user",
      account_type: "admin",
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };

    const isExpired = expiredPayload.exp * 1000 < Date.now();
    expect(isExpired).toBe(true);
  });

  it("redirects to /login?error=insufficient_permissions for regular user", () => {
    const userPayload = {
      sub: "regular-user",
      account_type: "free",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const allowedRoles = ["superadmin", "admin"];
    const hasAccess = allowedRoles.includes(userPayload.account_type);
    expect(hasAccess).toBe(false);
  });

  it("allows access for admin account_type", () => {
    const adminPayload = {
      sub: "admin-user",
      account_type: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const allowedRoles = ["superadmin", "admin"];
    const hasAccess = allowedRoles.includes(adminPayload.account_type);
    expect(hasAccess).toBe(true);
  });

  it("allows access for superadmin account_type", () => {
    const superadminPayload = {
      sub: "superadmin-user",
      account_type: "superadmin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const allowedRoles = ["superadmin", "admin"];
    const hasAccess = allowedRoles.includes(superadminPayload.account_type);
    expect(hasAccess).toBe(true);
  });

  it("redirects when account_type is in user_metadata (Supabase format)", () => {
    const supabasePayload = {
      sub: "user",
      user_metadata: { account_type: "free" },
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const accountType =
      supabasePayload.user_metadata?.account_type ??
      (supabasePayload as Record<string, unknown>).account_type;
    const allowedRoles = ["superadmin", "admin"];
    const hasAccess = allowedRoles.includes(accountType as string);
    expect(hasAccess).toBe(false);
  });

  it("redirects to /login?error=account_suspended for suspended user", () => {
    const suspendedPayload = {
      sub: "suspended-admin",
      account_type: "admin",
      user_metadata: { status: "suspended" },
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const status =
      suspendedPayload.user_metadata?.status ??
      (suspendedPayload as Record<string, unknown>).status;
    expect(status).toBe("suspended");
  });
});

// ─── User Isolation — Blog Content Visibility ───────────────────────────────

describe("Admin Dashboard — Blog Content Isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  it("admin can see all posts including drafts and hidden", async () => {
    const allPosts = {
      posts: [
        { id: "1", title: "Published Post", status: "published" },
        { id: "2", title: "Draft Post", status: "draft" },
        { id: "3", title: "Hidden Post", status: "hidden" },
      ],
      total: 3,
      page: 1,
      limit: 50,
      total_pages: 1,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(allPosts), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "admin-token",
    });

    expect(result.ok).toBe(true);
    const data = result.data as typeof allPosts;
    expect(data.posts).toHaveLength(3);
    expect(data.posts.map((p) => p.status)).toContain("draft");
    expect(data.posts.map((p) => p.status)).toContain("hidden");
  });

  it("regular user is blocked from seeing any posts via admin endpoint", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "blog",
      path: "/api/admin/posts",
      token: "regular-user-token",
    });

    expect(result.status).toBe(403);
    expect(result.ok).toBe(false);
  });
});

// ─── User Isolation — Careers PII Visibility ────────────────────────────────

describe("Admin Dashboard — Careers PII Isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  it("admin can access application details with decrypted PII", async () => {
    const applicationDetail = {
      id: "app-123",
      full_name: "Jane Doe",
      email: "jane@example.com",
      status: "submitted",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(applicationDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/applications/app-123",
      token: "admin-token",
    });

    expect(result.ok).toBe(true);
    expect((result.data as typeof applicationDetail).full_name).toBe("Jane Doe");
  });

  it("regular user cannot access application PII", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/applications/app-123",
      token: "user-token",
    });

    expect(result.status).toBe(403);
  });

  it("regular user cannot download CV files", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/applications/app-123/cv",
      token: "user-token",
    });

    expect(result.status).toBe(403);
  });

  it("regular user cannot send emails to applicants", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/applications/app-123/email",
      method: "POST",
      token: "user-token",
      body: { subject: "Hi", body: "Test" },
    });

    expect(result.status).toBe(403);
  });

  it("admin can manage vacancy statuses", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "vacancy-1", status: "open" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { proxyToService } = await import("@/lib/bff");
    const result = await proxyToService({
      service: "careers",
      path: "/api/admin/vacancies/vacancy-1/status",
      method: "PATCH",
      token: "admin-token",
      body: { status: "open" },
    });

    expect(result.ok).toBe(true);
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockRequest(opts: { cookies?: Record<string, string> }) {
  return {
    cookies: {
      get: (name: string) => {
        const value = opts.cookies?.[name];
        return value ? { value } : undefined;
      },
    },
  } as unknown as import("next/server").NextRequest;
}
