/**
 * Pure, in-process aggregation of `page_visits` rows.
 *
 * Spec: admin-templates-visitors (Req 13, Design §Visitor Aggregation Algorithm)
 *
 * Input:  raw rows read from `page_visits` via `supabaseAdmin`.
 * Output: the response body shape for `GET /api/admin/visitors`.
 *
 * The function is pure (no Date.now, no external I/O): the caller supplies
 * `nowMs` so the implementation is deterministic and straightforward to test
 * with property-based tests.
 */

export type VisitRange = "7d" | "30d" | "all";

export interface VisitRow {
  page: string;
  country_code: string | null;
  country_name: string | null;
  visited_at: string; // ISO timestamp
}

export interface VisitorAggregate {
  totals: {
    allTime: number;
    last7Days: number;
    last30Days: number;
    today: number;
  };
  byCountry: Array<{
    country_code: string | null;
    country_name: string | null;
    count: number;
    percentage: number;
  }>;
  byPage: Array<{ page: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
  uniqueCountries: number;
}

const DAY_MS = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isoDateOnly(ms: number): string {
  // yyyy-mm-dd in the local timezone — matches `toISOString().slice(0, 10)`
  // but without TZ offsets since the caller-provided timestamps are ISO.
  // We format from UTC-aligned startOfDay to avoid DST drift surprises.
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Round to one decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function aggregateVisits(
  rows: VisitRow[],
  range: VisitRange,
  nowMs: number
): VisitorAggregate {
  const startOfTodayMs = startOfDay(nowMs);

  const windowStartMs =
    range === "7d"
      ? nowMs - 7 * DAY_MS
      : range === "30d"
        ? nowMs - 30 * DAY_MS
        : -Infinity;

  // Totals — independent of range for allTime / last7 / last30 / today.
  let allTime = 0;
  let last7 = 0;
  let last30 = 0;
  let today = 0;

  for (const r of rows) {
    const t = Date.parse(r.visited_at);
    if (!Number.isFinite(t)) continue;
    allTime += 1;
    if (t >= nowMs - 7 * DAY_MS) last7 += 1;
    if (t >= nowMs - 30 * DAY_MS) last30 += 1;
    if (t >= startOfTodayMs) today += 1;
  }

  // Rows inside the selected range drive byCountry/byPage/uniqueCountries.
  const inRange = rows.filter((r) => {
    const t = Date.parse(r.visited_at);
    return Number.isFinite(t) && t >= windowStartMs;
  });

  // byCountry aggregation.
  const countryBuckets = new Map<
    string,
    { code: string | null; name: string | null; count: number }
  >();
  for (const r of inRange) {
    const key = r.country_code ?? "__unknown__";
    const existing = countryBuckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      countryBuckets.set(key, {
        code: r.country_code,
        name: r.country_name,
        count: 1,
      });
    }
  }
  const totalInRange = inRange.length;
  const byCountry = [...countryBuckets.values()]
    .map((b) => ({
      country_code: b.code,
      country_name: b.name,
      count: b.count,
      percentage:
        totalInRange === 0 ? 0 : round1((b.count / totalInRange) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // byPage aggregation.
  const pageBuckets = new Map<string, number>();
  for (const r of inRange) {
    pageBuckets.set(r.page, (pageBuckets.get(r.page) ?? 0) + 1);
  }
  const byPage = [...pageBuckets.entries()]
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count);

  // daily — always last 30 days, ascending.
  const daily: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const dayStartMs = startOfTodayMs - i * DAY_MS;
    const dayEndMs = dayStartMs + DAY_MS;
    let count = 0;
    for (const r of rows) {
      const t = Date.parse(r.visited_at);
      if (!Number.isFinite(t)) continue;
      if (t >= dayStartMs && t < dayEndMs) count += 1;
    }
    daily.push({ date: isoDateOnly(dayStartMs), count });
  }

  // uniqueCountries — distinct non-null country_code in selected range.
  const uniqueCountries = new Set(
    inRange
      .map((r) => r.country_code)
      .filter((c): c is string => c !== null && c !== undefined)
  ).size;

  return {
    totals: {
      allTime,
      last7Days: last7,
      last30Days: last30,
      today,
    },
    byCountry,
    byPage,
    daily,
    uniqueCountries,
  };
}
