/**
 * VPS Monitoring — RBAC & User Isolation Tests
 *
 * Tests verify:
 * 1. RBAC: Only admin/superadmin can access the monitoring API
 * 2. RBAC: Missing/expired/invalid tokens are rejected with 401
 * 3. RBAC: Non-admin users (free, paid) cannot access monitoring
 * 4. User Isolation: userId parameter properly filters PromQL queries
 * 5. User Isolation: PromQL injection via userId is prevented
 * 6. E2E: API correctly proxies to Prometheus and returns structured data
 * 7. E2E: Users endpoint returns user list from per-user metrics
 * 8. Graceful degradation: service unavailability returns 503
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── JWT Token Helpers ──────────────────────────────────────────────────────

/**
 * Create a base64url-encoded mock JWT with custom payload.
 * This produces a structurally valid JWT that jwt-decode can parse.
 */
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
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  });
}

function superadminToken(overrides: Record<string, unknown> = {}): string {
  return createMockJwt({
    sub: "superadmin-user-id-001",
    email: "grandmaster@aivory.ai",
    account_type: "superadmin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  });
}

function supabaseAdminToken(): string {
  return createMockJwt({
    sub: "supabase-admin-uuid",
    email: "admin@aivory.id",
    user_metadata: { account_type: "admin" },
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
    exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    iat: Math.floor(Date.now() / 1000) - 7200,
  });
}

// ─── Mock Request Factory ───────────────────────────────────────────────────

function createMonitoringRequest(opts: {
  token?: string;
  query?: string;
  type?: string;
  userId?: string;
  start?: string;
  end?: string;
  step?: string;
}): NextRequest {
  const params = new URLSearchParams();
  if (opts.query) params.set("query", opts.query);
  if (opts.type) params.set("type", opts.type);
  if (opts.userId) params.set("userId", opts.userId);
  if (opts.start) params.set("start", opts.start);
  if (opts.end) params.set("end", opts.end);
  if (opts.step) params.set("step", opts.step);

  const url = `http://localhost:9002/api/admin/vps-monitoring?${params.toString()}`;
  const request = new NextRequest(url);

  if (opts.token) {
    // Set the cookie on the request
    request.cookies.set("aivory_access_token", opts.token);
  }

  return request;
}

// ─── RBAC Tests ─────────────────────────────────────────────────────────────

describe("VPS Monitoring API — RBAC", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("returns 401 when no auth cookie is present", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({ query: "up" });
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("No token provided");
  });

  it("returns 401 when token is expired", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: expiredAdminToken(),
      query: "up",
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Token expired");
  });

  it("returns 401 when token has non-admin account_type", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: regularUserToken(),
      query: "up",
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Insufficient permissions");
  });

  it("returns 401 when token is malformed/garbage", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: "not-a-valid-jwt-at-all",
      query: "up",
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid token");
  });

  it("accepts valid admin token (legacy flat claim)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "up",
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("accepts valid superadmin token", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: superadminToken(),
      query: "up",
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("accepts valid Supabase-format admin token (user_metadata)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: supabaseAdminToken(),
      query: "up",
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("returns 400 when query parameter is missing", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      // No query parameter
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required parameter");
  });
});

// ─── User Isolation Tests ───────────────────────────────────────────────────

describe("VPS Monitoring API — User Isolation", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("injects user_id label filter when userId is provided", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: 'avry_user_cpu_seconds_total{user_tier="paid"}',
      userId: "user-abc-123",
    });
    await GET(request);

    // Verify the fetch call includes the user_id in the query
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const fetchedUrl = fetchCall[0] as string;
    expect(fetchedUrl).toContain("user_id");
    expect(fetchedUrl).toContain("user-abc-123");
  });

  it("adds user_id filter to queries without existing labels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_memory_rss_bytes",
      userId: "user-xyz-789",
    });
    await GET(request);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const fetchedUrl = fetchCall[0] as string;
    expect(fetchedUrl).toContain("user_id");
    expect(fetchedUrl).toContain("user-xyz-789");
  });

  it("prevents PromQL injection via userId with special characters", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    // Attempt injection with curly braces and quotes
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      userId: 'user"}|up|foo{bar="',
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid userId format");
  });

  it("prevents PromQL injection via userId with pipe characters", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      userId: "user123|malicious_query",
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("prevents PromQL injection via userId with backticks", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "up",
      userId: "user`rm -rf /`",
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("allows valid userId formats: UUID", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      userId: "550e8400-e29b-41d4-a716-446655440000",
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("allows valid userId formats: email-like", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      userId: "user@example.com",
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("allows valid userId formats: alphanumeric with hyphens/underscores", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      userId: "GrandMasterRCH",
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("does not apply user filter when userId is not provided (global view)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result: [] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      // No userId — global view
    });
    await GET(request);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const fetchedUrl = fetchCall[0] as string;
    // Should NOT contain user_id filter
    expect(fetchedUrl).not.toContain("user_id");
  });
});

// ─── E2E API Proxy Tests ────────────────────────────────────────────────────

describe("VPS Monitoring API — E2E Prometheus Proxy", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("proxies instant query to Prometheus and returns result", async () => {
    const prometheusResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          {
            metric: { instance: "node-exporter:9100", job: "node_exporter" },
            value: [1717680000, "45.2"],
          },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(prometheusResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("success");
    expect(body.data.result).toHaveLength(1);
    expect(body.data.result[0].value[1]).toBe("45.2");
  });

  it("proxies range query with start/end/step parameters", async () => {
    const rangeResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: { instance: "node-exporter:9100" },
            values: [
              [1717680000, "42.1"],
              [1717680015, "43.5"],
              [1717680030, "41.8"],
            ],
          },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(rangeResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "node_cpu_seconds_total",
      type: "range",
      start: "1717680000",
      end: "1717680030",
      step: "15s",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);

    // Verify the correct Prometheus endpoint was called
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const fetchedUrl = fetchCall[0] as string;
    expect(fetchedUrl).toContain("/api/v1/query_range");
    expect(fetchedUrl).toContain("start=1717680000");
    expect(fetchedUrl).toContain("end=1717680030");
    expect(fetchedUrl).toContain("step=15s");
  });

  it("returns 503 when Prometheus is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED")
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "up",
    });
    const response = await GET(request);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Monitoring service unavailable");
  });

  it("returns 502 when Prometheus returns non-200", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("Bad Request: invalid query", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "invalid{{{query",
    });
    const response = await GET(request);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toContain("Prometheus returned 400");
  });

  it("returns per-user metrics with proper isolation for specific user", async () => {
    const userMetricsResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          {
            metric: {
              user_id: "user-abc-123",
              user_tier: "paid",
              container_id: "abc123def456",
            },
            value: [1717680000, "120.5"],
          },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(userMetricsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );
    const request = createMonitoringRequest({
      token: adminToken(),
      query: "avry_user_cpu_seconds_total",
      userId: "user-abc-123",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.result[0].metric.user_id).toBe("user-abc-123");
  });
});

// ─── Users Endpoint RBAC ────────────────────────────────────────────────────

describe("VPS Monitoring Users API — RBAC & E2E", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("returns 401 when no auth cookie is present", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/users/route"
    );
    const request = new NextRequest(
      "http://localhost:9002/api/admin/vps-monitoring/users"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 for regular user token", async () => {
    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/users/route"
    );
    const request = new NextRequest(
      "http://localhost:9002/api/admin/vps-monitoring/users"
    );
    request.cookies.set("aivory_access_token", regularUserToken());
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns user list for valid admin token", async () => {
    const prometheusResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          { metric: { user_id: "user-001", user_tier: "paid" }, value: [1717680000, "1"] },
          { metric: { user_id: "user-002", user_tier: "free" }, value: [1717680000, "1"] },
          { metric: { user_id: "user-003", user_tier: "paid" }, value: [1717680000, "1"] },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(prometheusResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/users/route"
    );
    const request = new NextRequest(
      "http://localhost:9002/api/admin/vps-monitoring/users"
    );
    request.cookies.set("aivory_access_token", adminToken());
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users).toHaveLength(3);
    expect(body.users[0]).toHaveProperty("userId");
    expect(body.users[0]).toHaveProperty("tier");
  });

  it("returns sorted user list", async () => {
    const prometheusResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          { metric: { user_id: "zulu-user", user_tier: "free" }, value: [1717680000, "1"] },
          { metric: { user_id: "alpha-user", user_tier: "paid" }, value: [1717680000, "1"] },
          { metric: { user_id: "mike-user", user_tier: "paid" }, value: [1717680000, "1"] },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(prometheusResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/users/route"
    );
    const request = new NextRequest(
      "http://localhost:9002/api/admin/vps-monitoring/users"
    );
    request.cookies.set("aivory_access_token", superadminToken());
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    // Should be sorted alphabetically
    expect(body.users[0].userId).toBe("alpha-user");
    expect(body.users[1].userId).toBe("mike-user");
    expect(body.users[2].userId).toBe("zulu-user");
  });

  it("returns 502 when Prometheus is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/users/route"
    );
    const request = new NextRequest(
      "http://localhost:9002/api/admin/vps-monitoring/users"
    );
    request.cookies.set("aivory_access_token", adminToken());
    const response = await GET(request);

    expect(response.status).toBe(502);
  });

  it("returns empty user list gracefully when no per-user metrics exist", async () => {
    const emptyResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(emptyResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/users/route"
    );
    const request = new NextRequest(
      "http://localhost:9002/api/admin/vps-monitoring/users"
    );
    request.cookies.set("aivory_access_token", adminToken());
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users).toEqual([]);
  });
});

// ─── Client-Side Monitoring Library Tests ───────────────────────────────────

describe("Monitoring Client Library — getTimeRange", () => {
  it("returns correct step sizes for all presets", async () => {
    const { getTimeRange } = await import("@/lib/monitoring");

    const ranges = ["15m", "1h", "6h", "24h", "7d", "30d"];
    const expectedSteps = ["15s", "30s", "2m", "5m", "30m", "2h"];

    ranges.forEach((preset, i) => {
      const { step, start, end } = getTimeRange(preset);
      expect(step).toBe(expectedSteps[i]);
      // start should be before end
      expect(parseInt(start)).toBeLessThan(parseInt(end));
    });
  });

  it("returns valid Unix timestamps", async () => {
    const { getTimeRange } = await import("@/lib/monitoring");
    const { start, end } = getTimeRange("1h");
    const now = Math.floor(Date.now() / 1000);

    // End should be approximately now (within 5 seconds)
    expect(Math.abs(parseInt(end) - now)).toBeLessThan(5);
    // Start should be approximately 1 hour ago
    expect(Math.abs(parseInt(start) - (now - 3600))).toBeLessThan(5);
  });
});

describe("Monitoring Client Library — parseInstantValue", () => {
  it("parses a valid single result", async () => {
    const { parseInstantValue } = await import("@/lib/monitoring");
    const result = [{ metric: {}, value: [1717680000, "85.5"] as [number, string] }];
    expect(parseInstantValue(result)).toBe(85.5);
  });

  it("returns 0 for empty results", async () => {
    const { parseInstantValue } = await import("@/lib/monitoring");
    expect(parseInstantValue([])).toBe(0);
  });

  it("returns 0 for NaN value", async () => {
    const { parseInstantValue } = await import("@/lib/monitoring");
    const result = [{ metric: {}, value: [1717680000, "NaN"] as [number, string] }];
    expect(parseInstantValue(result)).toBe(0);
  });
});

describe("Monitoring Client Library — parseResultsByLabel", () => {
  it("builds a label-to-value map from multiple results", async () => {
    const { parseResultsByLabel } = await import("@/lib/monitoring");
    const results = [
      { metric: { instance: "backend:8082" }, value: [1717680000, "1"] as [number, string] },
      { metric: { instance: "blueprint:8086" }, value: [1717680000, "0"] as [number, string] },
      { metric: { instance: "workflows:8087" }, value: [1717680000, "1"] as [number, string] },
    ];
    const map = parseResultsByLabel(results, "instance");
    expect(map["backend:8082"]).toBe(1);
    expect(map["blueprint:8086"]).toBe(0);
    expect(map["workflows:8087"]).toBe(1);
  });
});

// ─── All Admins See Same Data ───────────────────────────────────────────────

describe("VPS Monitoring — Admin Consistency", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("admin and superadmin see the same monitoring data (same query, same result)", async () => {
    const commonResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          { metric: { job: "node_exporter" }, value: [1717680000, "72.3"] },
        ],
      },
    };

    // Admin request
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(commonResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { GET } = await import(
      "@/app/api/admin/vps-monitoring/route"
    );

    const adminRequest = createMonitoringRequest({
      token: adminToken(),
      query: "node_memory_MemTotal_bytes",
    });
    const adminResponse = await GET(adminRequest);
    const adminBody = await adminResponse.json();

    // Superadmin request
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(commonResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const superadminRequest = createMonitoringRequest({
      token: superadminToken(),
      query: "node_memory_MemTotal_bytes",
    });
    const superadminResponse = await GET(superadminRequest);
    const superadminBody = await superadminResponse.json();

    // Both should get identical results
    expect(adminBody).toEqual(superadminBody);
    expect(adminResponse.status).toBe(superadminResponse.status);
  });
});
