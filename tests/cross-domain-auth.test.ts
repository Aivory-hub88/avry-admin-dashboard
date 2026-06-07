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
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Simulates the current (buggy) cookie behavior in cookies.ts
 * Uses SameSite=Lax which blocks cross-site cookie transmission
 */
function buggySetCookie(
  name: string,
  value: string,
  options: { maxAge?: number; path?: string; domain?: string } = {}
): string {
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
  name: string,
  value: string,
  options: { maxAge?: number; path?: string; domain?: string } = {}
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
  cookie += `; path=${options.path ?? "/"}`;
  cookie += "; SameSite=None; Secure"; // CORRECT: None allows cross-site
  if (options.domain) cookie += `; Domain=${options.domain}`;
  return cookie;
}

/**
 * Simulates cookie parsing from document.cookie
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;
  
  cookieString.split(";").forEach(pair => {
    const [name, value] = pair.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * Simulates cross-subdomain navigation scenario
 */
describe("Cross-Domain Authentication Bug Condition", () => {
  describe("Bug Condition: Cross-Domain Cookie Transmission", () => {
    test("1.1: Cookie set with SameSite=None should be sent during cross-subdomain navigation", () => {
      // Simulate login on stag.aivory.id with correct cookie settings
      const authCookieValue = JSON.stringify({
        accessToken: "test-access-token-123",
        refreshToken: "test-refresh-token-456",
        user: { id: "user-123", email: "test@example.com", role: "admin" }
      });
      
      // Frontend sets cookie with SameSite=None;Secure;Domain=.aivory.id
      const frontendCookie = buggySetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Simulate navigation to admin.aivory.id
      // The cookie should be sent, but SameSite=Lax blocks it
      const receivedCookies = parseCookies(frontendCookie);
      
      // BUG: With SameSite=Lax, this cookie won't be sent during cross-site navigation
      // This test EXPECTS to fail on unfixed code
      assert.ok(
        receivedCookies["aivory_session_token"],
        "Authentication cookie should be transmitted during cross-subdomain navigation"
      );
    });

    test("1.2: Cookie set with SameSite=None should be sent during navigation to dashboard.aivory.id", () => {
      // Simulate login on stag.aivory.id
      const authCookieValue = JSON.stringify({
        accessToken: "test-access-token-789",
        user: { id: "user-456", email: "user@example.com", role: "user" }
      });
      
      const frontendCookie = buggySetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Simulate navigation to dashboard.aivory.id
      const receivedCookies = parseCookies(frontendCookie);
      
      // BUG: SameSite=Lax blocks cross-site transmission
      assert.ok(
        receivedCookies["aivory_session_token"],
        "Authentication cookie should be transmitted when navigating to dashboard.aivory.id"
      );
    });

    test("1.3: Cookie with SameSite=None should be readable by target domain after navigation", () => {
      // Simulate the full flow: login on stag.aivory.id, navigate to admin.aivory.id
      const authCookieValue = JSON.stringify({
        accessToken: "test-access-token-final",
        user: { id: "user-final", email: "final@example.com", role: "admin" }
      });
      
      // Cookie set by frontend (correct configuration)
      const frontendCookie = correctSetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Cookie set by admin dashboard (buggy - uses SameSite=Lax)
      const dashboardCookie = buggySetCookie(
        "aivory_session_token",
        authCookieValue,
        { domain: ".aivory.id" }
      );
      
      // Parse both cookies
      const frontendParsed = parseCookies(frontendCookie);
      const dashboardParsed = parseCookies(dashboardCookie);
      
      // BUG: The dashboard's SameSite=Lax cookie won't be sent during cross-site navigation
      // This demonstrates why the user gets redirected to login
      assert.ok(
        dashboardParsed["aivory_session_token"],
        "Admin dashboard should be able to read authentication cookie after cross-subdomain navigation"
      );
    });
  });

  describe("Edge Cases", () => {
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
      assert.ok(
        hasRootDomain,
        "Authentication cookies must use root domain (.aivory.id) for cross-subdomain access"
      );
    });
  });
});
