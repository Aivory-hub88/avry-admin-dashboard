/**
 * Flag emoji derivation — pure, deterministic, no dependencies.
 *
 * Maps a two-letter ISO 3166-1 alpha-2 code to the corresponding
 * Unicode regional indicator sequence (e.g. "US" → 🇺🇸).
 *
 * Contract (Req 16.3, 16.4):
 * - Returns "" for null / undefined / non-two-letter input; the caller is
 *   responsible for rendering an "Unknown" label in that case.
 * - Referentially transparent: repeated calls with the same argument
 *   return the same value.
 */
const REGIONAL_INDICATOR_A = 0x1f1e6;
const UPPERCASE_A = "A".charCodeAt(0);

export function flagEmoji(code: string | null | undefined): string {
  if (code == null) return "";
  if (typeof code !== "string") return "";
  const trimmed = code.trim();
  if (trimmed.length !== 2) return "";
  const upper = trimmed.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  const cp1 = REGIONAL_INDICATOR_A + (upper.charCodeAt(0) - UPPERCASE_A);
  const cp2 = REGIONAL_INDICATOR_A + (upper.charCodeAt(1) - UPPERCASE_A);
  return String.fromCodePoint(cp1, cp2);
}
