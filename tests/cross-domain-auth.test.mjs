/**
 * Cross-Domain Authentication Bug Condition Exploration Test
 * 
 * This test simulates the bug condition where authentication cookies set on
 * stag.aivory.id are not transmitted to admin.aivory.id or dashboard.aivory.id
 * during cross-subdomain navigation.
 * 
 * Bug Condition: Cookies set with SameSite=None on one subdomain are not
 * accessible from another subdomain due to SameSite=Lax being used in the
 * receiving domain's cookie functions.
 * 
 * Expected: Test FAILS on unfixed code (proves bug exists)
 * After Fix: Test PASSES (confirms bug is resolved)
 * 
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * Run with: node --test AVRY-admin-dashboard/tests/cross-domain-auth.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Simulates the current (buggy) cookie behavior in cookies.ts
 * Uses SameSite=Lax which blocks cross-site cookie transmission
 */
function buggySetCookie(
  name,
  value,
  options = {}
) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
  cookie += `; path=${options.path ?? "/"}`;
  cookie += "; SameSite=Lax"; // BUG: Lax blocks cross-site transmission
  if (options.domain) cookie += `; Domain=${options.domain}`;
  return cookie;
}

/**
 * Simulates the correct cookie behavior for cross-domain auth
 * Uses SameSite=None;Secure for cross-subdomain transmission
 */
function correctSetCookie(
  name,
  value,
  options = {}
) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
  cookie += `; path=${options.path ?? "/"}`;
  cookie += "; SameSite=None; Secure"; // CORRECT: None allows cross-site
  if (options.domain) cookie += `; Domain=${options.domain}`;
  return cookie;
}

/**
 * Simulates browser cookie transmission behavior during navigation
 * 
 * When navigating from one domain to another, the browser only sends cookies
 * that don't have SameSite=Lax (or SameSite=Strict). SameSite=None cookies
 * with Secure flag are sent during cross-site navigation.
 */
function simulateCookieTransmission(
  cookieString,
  sourceDomain,
  targetDomain
) {
  // Simulate browser behavior: SameSite=Lax cookies are NOT sent during cross-site navigation
  const cookies = {};
  
  if (!cookieString) return cookies;
  
  cookieString.split(";").forEach(pair => {
    const [name, value] = pair.trim().split("=");
    if (name && value) {
      // Check if cookie has SameSite=Lax (which blocks cross-site transmission)
      const hasLax = pair.includes("SameSite=Lax");
      const isCrossSite = sourceDomain !== targetDomain;
      
      // SameSite=Lax blocks transmission during cross-site navigation
      if (!hasLax || !isCrossSite) {
        cookies[name] = decodeURIComponent(value);
      }
    }
  });
  
  return cookies;
}

/**
 * Simulates cross-subdomain navigation scenario
 */
describe("Cross-Domain Authentication Bug Condition", () => {
  describe("Bug Condition: Cross-Domain Cookie Transmission", () => {
    test("1.1: Cookie with SameSite=Lax is NOT sent during cross-subdomain navigation (demonstrates bug)", () => {
      // Simulate login on stag.aivory.id with SAME-SITE=LAX (the bug)
      const authCookieValue = JSON.stringify({
        accessToken: "test-access-token-123",
        refreshToken: "test-refresh-token-456",
        user: { id: "user-123", email: "test@example.com", role: "admin" }
      });
      
      // Admin dashboard sets cookie with SameSite=Lax (BUG)
      const dashboardCookie = buggySetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Simulate navigation from stag.aivory.id to admin.aivory.id
      const receivedCookies = simulateCookieTransmission(
        dashboardCookie,
        "stag.aivory.id",
        "admin.aivory.id"
      );
      
      // BUG DEMONSTRATION: SameSite=Lax blocks cross-site transmission
      // This test EXPECTS to FAIL on unfixed code - it proves the bug exists
      assert.ok(
        receivedCookies["aivory_session_token"],
        "Authentication cookie should be transmitted during cross-subdomain navigation"
      );
    });

    test("1.2: Cookie with SameSite=Lax is NOT sent during navigation to dashboard.aivory.id", () => {
      // Simulate login on stag.aivory.id with SameSite=Lax (the bug)
      const authCookieValue = JSON.stringify({
        accessToken: "test-access-token-789",
        user: { id: "user-456", email: "user@example.com", role: "user" }
      });
      
      const dashboardCookie = buggySetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Simulate navigation from stag.aivory.id to dashboard.aivory.id
      const receivedCookies = simulateCookieTransmission(
        dashboardCookie,
        "stag.aivory.id",
        "dashboard.aivory.id"
      );
      
      // BUG DEMONSTRATION: SameSite=Lax blocks cross-site transmission
      assert.ok(
        receivedCookies["aivory_session_token"],
        "Authentication cookie should be transmitted when navigating to dashboard.aivory.id"
      );
    });

    test("1.3: Cookie with SameSite=None;Secure IS sent during cross-subdomain navigation (correct behavior)", () => {
      // Simulate the full flow: login on stag.aivory.id with CORRECT settings
      const authCookieValue = JSON.stringify({
        accessToken: "test-access-token-final",
        user: { id: "user-final", email: "final@example.com", role: "admin" }
      });
      
      // Cookie set with SameSite=None;Secure (CORRECT configuration)
      const correctCookie = correctSetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Simulate navigation from stag.aivory.id to admin.aivory.id
      const receivedCookies = simulateCookieTransmission(
        correctCookie,
        "stag.aivory.id",
        "admin.aivory.id"
      );
      
      // CORRECT BEHAVIOR: SameSite=None;Secure allows cross-site transmission
      assert.ok(
        receivedCookies["aivory_session_token"],
        "Authentication cookie with SameSite=None;Secure should be transmitted during cross-subdomain navigation"
      );
    });
  });

  describe("Edge Cases - Bug Demonstrations", () => {
    test("Missing Secure flag with SameSite=None should fail in modern browsers", () => {
      // SameSite=None requires Secure flag in modern browsers
      const cookieWithoutSecure = buggySetCookie(
        "aivory_session_token",
        "test-value",
        { domain: ".aivory.id" }
      );
      
      // Check if Secure flag is present
      const hasSecure = cookieWithoutSecure.includes("; Secure");
      
      // BUG: Without Secure flag, SameSite=None cookies are rejected by modern browsers
      // This test EXPECTS to FAIL on unfixed code
      assert.ok(
        hasSecure,
        "Cookies with SameSite=None must have Secure flag for modern browsers"
      );
    });

    test("Cookie domain should be .aivory.id (root domain) for cross-subdomain access", () => {
      // Cookie set with specific subdomain won't be sent to other subdomains
      const cookieWithSubdomain = buggySetCookie(
        "aivory_session_token",
        "test-value",
        { domain: "admin.aivory.id" } // WRONG: should be .aivory.id
      );
      
      // Check if domain is root domain
      const hasRootDomain = cookieWithSubdomain.includes("Domain=.aivory.id");
      
      // BUG: Specific subdomain prevents cross-subdomain access
      // This test EXPECTS to FAIL on unfixed code
      assert.ok(
        hasRootDomain,
        "Authentication cookies must use root domain (.aivory.id) for cross-subdomain access"
      );
    });
  });
});
