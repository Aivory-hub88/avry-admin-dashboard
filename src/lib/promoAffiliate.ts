/**
 * Mirrors `affiliate_prefix` in avry-payments' app/services/promo.py, so the
 * form can preview the codes the service will generate. The service remains
 * the authority; this only drives the preview.
 */
const ENTITY_WORDS = new Set([
  "PT", "CV", "TBK", "UD", "PD", "FIRMA", "KOPERASI", "YAYASAN",
  "LTD", "LLC", "INC", "CORP", "CO", "COMPANY", "GROUP", "THE",
]);
const MAX = 12;

export function affiliatePrefix(name?: string | null, company?: string | null): string {
  for (const source of [company, name]) {
    const words = (source ?? "").toUpperCase().match(/[A-Z0-9]+/g) ?? [];
    const meaningful = words.filter((w) => !ENTITY_WORDS.has(w));
    const joined = (meaningful.length ? meaningful : words).join("").slice(0, MAX);
    if (joined.length >= 2) return joined;
  }
  return "";
}
