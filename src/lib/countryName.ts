/**
 * Country name lookup — resolves ISO 3166-1 alpha-2 codes to English country
 * names via the `country-list` npm package.
 *
 * Contract (Req 21):
 * - No outbound network calls, no runtime fetch (synchronous in-process lookup).
 * - If the code is not recognized, falls back to the raw `code` value unchanged
 *   (Req 21.5). This keeps whatever Vercel reports on disk instead of dropping it.
 */

// `country-list` is a CommonJS module without bundled type definitions.
// We declare the minimal shape we use here to satisfy TypeScript.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const countryList = require("country-list") as {
  getName: (code: string) => string | undefined;
};

/**
 * Resolve a two-letter ISO 3166-1 alpha-2 code to its English country name.
 * Falls back to the raw `code` when unknown.
 */
export function countryName(code: string): string {
  if (typeof code !== "string") return String(code ?? "");
  const trimmed = code.trim();
  if (trimmed.length !== 2) return code;
  const upper = trimmed.toUpperCase();
  const resolved = countryList.getName(upper);
  return resolved ?? code;
}
