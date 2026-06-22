/**
 * Property-based test for the VPS Monitoring Users endpoint.
 *
 * Property 1: Users endpoint response preserves upstream data
 * Validates: Requirements 1.2
 *
 * For any valid VPS Panel Users API response containing a list of user objects
 * with `userId` and `tier` fields, the Users Endpoint SHALL return the same set
 * of users with identical `userId` and `tier` values, sorted alphabetically
 * by `userId`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// Mock jwt-decode before importing the route
vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(() => ({
    sub: "admin-user-id",
    account_type: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  })),
}));

// Mock next/server to provide testable NextRequest/NextResponse
vi.mock("next/server", () => {
  class MockNextResponse {
    body: unknown;
    status: number;
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() {
      return this.body;
    }
  }

  class MockNextRequest {
    private cookieMap: Map<string, { value: string }>;
    constructor(url: string, options?: { headers?: Record<string, string> }) {
      this.cookieMap = new Map();
      // Suppress unused variable warning
      void url;
      void options;
    }
    cookies = {
      get: (name: string) => this.cookieMap.get(name),
    };
    setCookie(name: string, value: string) {
      this.cookieMap.set(name, { value });
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

import { GET } from "./route";
import { NextRequest } from "next/server";

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Arbitrary userId: non-empty alphanumeric-like strings with hyphens/underscores */
const userIdArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-z][a-z0-9_-]{0,29}$/);

/** Arbitrary tier: realistic tier names */
const tierArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom("free", "paid", "enterprise", "starter", "pro", "team"),
  fc.stringMatching(/^[a-z]{1,15}$/),
);

/** A single user entry from the VPS Panel API */
const userEntryArb = fc.record({
  userId: userIdArb,
  tier: tierArb,
});

/** Array of user entries (0 to 50 users) */
const usersArrayArb = fc.array(userEntryArb, { minLength: 0, maxLength: 50 });

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createAdminRequest(): InstanceType<typeof NextRequest> {
  const req = new (NextRequest as unknown as new (url: string) => Record<string, unknown>)(
    "http://localhost:9002/api/admin/vps-monitoring/users"
  ) as unknown as InstanceType<typeof NextRequest> & { setCookie: (name: string, value: string) => void };
  req.setCookie("aivory_access_token", "mock-valid-admin-token");
  return req;
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.VPS_PANEL_API_TOKEN = "test-vps-panel-token";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VPS_PANEL_API_TOKEN;
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe("Property 1: Users endpoint response preserves upstream data", () => {
  it("returns the same set of users with identical values, sorted alphabetically by userId", async () => {
    await fc.assert(
      fc.asyncProperty(usersArrayArb, async (generatedUsers) => {
        // Mock global fetch to return VPS Panel response with generated data
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: generatedUsers,
            timestamp: new Date().toISOString(),
          }),
        });
        vi.stubGlobal("fetch", mockFetch);

        const request = createAdminRequest();
        const response = await GET(request);
        const body = await response.json() as { users: Array<{ userId: string; tier: string }> };

        // Compute the expected result: same users sorted alphabetically by userId
        const expected = [...generatedUsers]
          .map((u) => ({ userId: u.userId, tier: u.tier }))
          .sort((a, b) => a.userId.localeCompare(b.userId));

        // Assert: response preserves all users with identical values, sorted
        expect(body.users).toEqual(expected);
        expect(body.users.length).toBe(generatedUsers.length);
      }),
      { numRuns: 100 },
    );
  });
});
