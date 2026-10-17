/**
 * Free-access durations a distributor partner can be given, in months.
 * Mirrors PARTNER_FREE_MONTH_OPTIONS in avry-backend's
 * app/routes/admin_users.py, which rejects any other value.
 */
export const PARTNER_FREE_MONTH_OPTIONS = [1, 3, 5] as const;

export type PartnerFreeMonths = (typeof PARTNER_FREE_MONTH_OPTIONS)[number];

export const DEFAULT_PARTNER_FREE_MONTHS: PartnerFreeMonths = 1;

export function formatFreeMonths(months: number): string {
  return months === 1 ? "1 month" : `${months} months`;
}

/** "Free until 17 Jan 2027", "Expired 3 Oct 2026", or null when unknown. */
export function describePartnerAccess(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): { label: string; expired: boolean } | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const expired = date.getTime() <= now.getTime();
  return { label: expired ? `Expired ${formatted}` : `Free until ${formatted}`, expired };
}
