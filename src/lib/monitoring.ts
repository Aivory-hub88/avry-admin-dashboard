/**
 * Monitoring API client library.
 *
 * Provides typed helper functions for querying the VPS monitoring API
 * (which proxies to Prometheus). Handles both instant and range queries
 * with proper error handling and user isolation support.
 */

export interface PrometheusResult {
  metric: Record<string, string>;
  value?: [number, string]; // [timestamp, value] for instant queries
  values?: [number, string][]; // [[timestamp, value], ...] for range queries
}

export interface PrometheusResponse {
  status: "success" | "error";
  data?: {
    resultType: "vector" | "matrix" | "scalar" | "string";
    result: PrometheusResult[];
  };
  error?: string;
  errorType?: string;
}

export interface MonitoringUser {
  userId: string;
  tier: string;
}

export interface QueryOptions {
  userId?: string;
  type?: "instant" | "range";
  start?: string;
  end?: string;
  step?: string;
}

/**
 * Execute a PromQL query through the admin monitoring API.
 */
export async function queryPrometheus(
  query: string,
  options: QueryOptions = {}
): Promise<PrometheusResponse> {
  const params = new URLSearchParams();
  params.set("query", query);

  if (options.type) params.set("type", options.type);
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  if (options.step) params.set("step", options.step);
  if (options.userId) params.set("userId", options.userId);

  const res = await fetch(`/api/admin/vps-monitoring?${params.toString()}`);

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Execute a range query for time-series chart data.
 */
export async function queryRange(
  query: string,
  start: string,
  end: string,
  step: string,
  userId?: string
): Promise<PrometheusResponse> {
  return queryPrometheus(query, {
    type: "range",
    start,
    end,
    step,
    userId,
  });
}

/**
 * Fetch list of users with active containers for the user selector.
 */
export async function fetchMonitoringUsers(): Promise<MonitoringUser[]> {
  const res = await fetch("/api/admin/vps-monitoring/users");

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch users: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.users || [];
}

/**
 * Parse a single numeric value from a Prometheus instant query result.
 */
export function parseInstantValue(result: PrometheusResult[]): number {
  if (!result.length || !result[0].value) return 0;
  return parseFloat(result[0].value[1]) || 0;
}

/**
 * Parse multiple labeled results into a map of label -> value.
 */
export function parseResultsByLabel(
  result: PrometheusResult[],
  labelKey: string
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of result) {
    const label = r.metric[labelKey] || "unknown";
    map[label] = parseFloat(r.value?.[1] || "0") || 0;
  }
  return map;
}

/**
 * Get time range parameters for common presets.
 */
export function getTimeRange(preset: string): {
  start: string;
  end: string;
  step: string;
} {
  const now = Math.floor(Date.now() / 1000);
  let startOffset: number;
  let step: string;

  switch (preset) {
    case "15m":
      startOffset = 15 * 60;
      step = "15s";
      break;
    case "1h":
      startOffset = 60 * 60;
      step = "30s";
      break;
    case "6h":
      startOffset = 6 * 60 * 60;
      step = "2m";
      break;
    case "24h":
      startOffset = 24 * 60 * 60;
      step = "5m";
      break;
    case "7d":
      startOffset = 7 * 24 * 60 * 60;
      step = "30m";
      break;
    case "30d":
      startOffset = 30 * 24 * 60 * 60;
      step = "2h";
      break;
    default:
      startOffset = 60 * 60;
      step = "30s";
  }

  return {
    start: String(now - startOffset),
    end: String(now),
    step,
  };
}
