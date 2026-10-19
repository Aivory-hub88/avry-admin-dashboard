/**
 * Display names for account types and plans.
 *
 * Every Aivory account is paid; there is no free plan. The internal tier value
 * `free` (and account_type `free`, a signup that never paid) means "no live
 * plan", shown as "Not activated". Mirrors planLabel/accountTypeLabel in
 * avry-user-dashboard's lib/tiers.ts.
 */
export const NOT_ACTIVATED_LABEL = "Not activated";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  free: "Not activated",
  paid: "Customer",
  partner: "Partner",
  demo: "Demo",
  admin: "Admin",
  superadmin: "Superadmin",
};

const PLAN_LABELS: Record<string, string> = {
  operational: "Operational",
  foundation: "Operational",
  business: "Business",
  pro: "Business",
  acceleration: "Business",
  enterprise: "Enterprise",
  intelligence: "Enterprise",
  snapshot: "Assessment",
  blueprint: "Blueprint",
};

export function accountTypeLabel(accountType: string | null | undefined): string {
  const key = (accountType ?? "").toLowerCase();
  return ACCOUNT_TYPE_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : "—");
}

export function planLabel(tier: string | null | undefined): string {
  return PLAN_LABELS[(tier ?? "").toLowerCase()] ?? NOT_ACTIVATED_LABEL;
}
