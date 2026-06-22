/**
 * Property-based test for VPS Monitoring Users endpoint error handling.
 *
 * Property 2: Non-success upstream responses yield error with empty users
 * Validates: Requirements 1.3
 *
 * For any non-2xx HTTP status code returned by the VPS Panel Users API,
 * the Users Endpoint SHALL return a 502 response containing an empty `users`
 * array and an `error` string field.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fc from "fast-check";

// ─── JWT Token Helper ────────────────────────────────────────────────────────

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

function adminToken(): string {
  return createMockJwt({
    sub: "admin-user-id-123",
    email: "admin@aivory.id",
    account_type: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates random non-2xx HTTP status codes that are valid for the
 * Web Response API. Some status codes (like 101, 204, 304) are "null body"
 * statuses that restrict Response construction. We focus on error-class
 * statuses (400-599) which represent realistic upstream failure scenarios,
 * plus a selection of valid 3xx redirects.
 */
const nonSuccessStatusArb: fc.Arbitrary<number> = fc.oneof(
  fc.constantFrom(300, 301, 302, 303, 307, 308), // 3xx redirects (excluding 304 null-body)
  fc.integer({ min: 400, max: 499 }), // 4xx client error
  fc.integer({ min: 500, max: 599 }), // 5xx server error
);

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("Property 2: Non-success upstream responses yield error with empty users", () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    originalEnv = process.env.VPS_PANEL_API_TOKEN;
    process.env.VPS_PANEL_API_TOKEN = "test-token-for-property-test";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.VPS_PANEL_API_TOKEN = originalEnv;
    } else {
      delete process.env.VPS_PANEL_API_TOKEN;
    }
    vi.resetModules();
  });

  it("always returns 502 with empty users array and error string for any non-2xx upstream status", async () => {
    await fc.assert(
      fc.asyncProperty(nonSuccessStatusArb, async (statusCode) => {
        // Reset module registry so each iteration gets a fresh import
        vi.resetModules();

        // Mock fetch to return a response with the generated non-2xx status
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          new Response("Upstream error", { status: statusCode })
        );

        const { GET } = await import(
          "@/app/api/admin/vps-monitoring/users/route"
        );

        const request = new NextRequest(
          "http://localhost:9002/api/admin/vps-monitoring/users"
        );
        request.cookies.set("aivory_access_token", adminToken());

        const response = await GET(request);
        const body = await response.json();

        // Assert: response status is 502
        expect(response.status).toBe(502);

        // Assert: response body has empty users array
        expect(body.users).toEqual([]);

        // Assert: response body has an error string field
        expect(typeof body.error).toBe("string");
        expect(body.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
