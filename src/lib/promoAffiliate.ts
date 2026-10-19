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

/**
 * Mirrors `affiliate_key` in avry-payments: two names with the same key are the
 * same affiliate (case, spacing, punctuation and PT/CV/Tbk ignored). The
 * service files a retyped name under the spelling already on record.
 */
export function affiliateKey(value?: string | null): string {
  const words = (value ?? "").toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const meaningful = words.filter((w) => !ENTITY_WORDS.has(w));
  return (meaningful.length ? meaningful : words).join("").toLowerCase();
}

export function affiliatePrefix(name?: string | null, company?: string | null): string {
  for (const source of [company, name]) {
    const words = (source ?? "").toUpperCase().match(/[A-Z0-9]+/g) ?? [];
    const meaningful = words.filter((w) => !ENTITY_WORDS.has(w));
    const joined = (meaningful.length ? meaningful : words).join("").slice(0, MAX);
    if (joined.length >= 2) return joined;
  }
  return "";
}
