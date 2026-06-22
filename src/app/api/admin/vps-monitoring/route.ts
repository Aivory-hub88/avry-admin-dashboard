/**
 * VPS Monitoring BFF route — proxies requests to the VPS Panel Monitoring API.
 *
 * Replaces the previous Prometheus-based proxy with direct VPS Panel queries.
 * Authenticates admin users via the `aivory_access_token` cookie, then forwards
 * requests to the VPS Panel's monitoring endpoints using `VPS_PANEL_API_TOKEN`
 * as Bearer auth.
 *
 * Supports two modes:
 *
 * 1. NEW: Direct VPS Panel queries via `type` parameter:
 *    - `type=system`  → GET /api/monitoring/system
 *    - `type=project` → GET /api/monitoring/projects/avry-v2-main
 *    - `type=history` → GET /api/monitoring/history?start=&end=&resolution=
 *
 * 2. LEGACY: Prometheus-compatible queries via `query` parameter:
 *    - Proxied to VPS Panel with query-based routing
 *    - Responses transformed to Prometheus format for frontend compatibility
 *
 * User isolation: when `userId` is provided, it's validated for injection
 * safety and forwarded as a filter parameter.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import {
  prometheusInstant,
  prometheusRange,
  containersToPrometheus,
} from "@/lib/monitoring-transforms";
import {
  systemMetricsToPrometheus as systemMetricsToPrometheusUtil,
  type VpsPanelSystemMetrics as VpsPanelSystemMetricsImported,
} from "./transforms";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  user_metadata?: { account_type?: string };
  app_metadata?: { account_type?: string };
  account_type?: string;
  exp: number;
}



interface VpsPanelProjectMetrics {
  projectId: string;
  displayName: string;
  cpu: { usagePercent: number };
  memory: { usedBytes: number; limitBytes: number };
  network: { rxBytes: number; txBytes: number };
  blockIo: { readBytes: number; writeBytes: number };
  containers: Array<{
    name: string;
    cpu: { usagePercent: number };
    memory: { usedBytes: number; limitBytes: number };
    network: { rxBytes: number; txBytes: number };
    blockIo: { readBytes: number; writeBytes: number };
  }>;
  timestamp: string;
}

export interface VpsPanelSystemMetrics {
  timestamp: string;
  cpu: {
    usagePercent: number;
    cores: number;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
  };
  network: {
    rxBytesPerSec: number;
    txBytesPerSec: number;
  };
}

interface VpsPanelHistoryPoint {
  timestamp: string;
  cpu: { usagePercent: number };
  memory: { usedBytes: number; totalBytes: number };
  disk: { usedBytes: number; totalBytes: number };
  network: { rxBytesPerSec: number; txBytesPerSec: number };
}

interface VpsPanelEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  code?: string;
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

function resolveAccountType(payload: JwtPayload): string | undefined {
  return (
    payload.user_metadata?.account_type ??
    payload.app_metadata?.account_type ??
    payload.account_type
  );
}

export function validateAdminToken(token: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!token) return { valid: false, error: "No token provided" };
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) {
      return { valid: false, error: "Token expired" };
    }
    const accountType = resolveAccountType(payload);
    if (!accountType || !["superadmin", "admin"].includes(accountType)) {
      return { valid: false, error: "Insufficient permissions" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid token" };
  }
}

// ─── VPS Panel Configuration ─────────────────────────────────────────────────

const VPS_PANEL_URL =
  process.env.VPS_PANEL_URL ?? "http://vps-panel:3000";
const VPS_PANEL_API_TOKEN = process.env.VPS_PANEL_API_TOKEN;

// Request timeout for VPS Panel calls (15 seconds)
const FETCH_TIMEOUT_MS = 15000;

// ─── User ID Validation ──────────────────────────────────────────────────────

/**
 * Validate userId format to prevent injection attacks.
 * Allows alphanumeric characters, hyphens, underscores, dots, and @ signs.
 */
function isValidUserId(userId: string): boolean {
  return /^[a-zA-Z0-9_\-@.]+$/.test(userId);
}

// ─── Request Type Detection ──────────────────────────────────────────────────

import { determineVpsPanelTarget, type VpsPanelRequestType } from "./query-routing";

type RequestMode = "vps-panel" | "legacy-prometheus";

function getRequestMode(type: string | null): RequestMode {
  if (type === "system" || type === "project" || type === "history" || type === "containers") {
    return "vps-panel";
  }
  return "legacy-prometheus";
}

// ─── VPS Panel Fetch Helper ──────────────────────────────────────────────────

export async function fetchVpsPanel(
  path: string,
  params?: URLSearchParams,
  retries = 2
): Promise<Response> {
  const url = params && params.toString()
    ? `${VPS_PANEL_URL}${path}?${params.toString()}`
    : `${VPS_PANEL_URL}${path}`;

  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${VPS_PANEL_API_TOKEN}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchVpsPanel(path, params, retries - 1);
    }
    throw error;
  }
}

/**
 * Detect whether a parsed JSON response is already in Prometheus format
 * (i.e., has `status` and `data.resultType` fields).
 */
export function isPrometheusFormat(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const obj = body as Record<string, unknown>;
  return (
    (obj.status === "success" || obj.status === "error") &&
    typeof obj.data === "object" &&
    obj.data !== null &&
    "resultType" in (obj.data as Record<string, unknown>)
  );
}

/**
 * Detect whether a parsed JSON response is in VPS Panel envelope format
 * (i.e., has `success` boolean and `data` field with metrics).
 */
export function isVpsPanelEnvelope(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const obj = body as Record<string, unknown>;
  return typeof obj.success === "boolean" && "data" in obj;
}

// ─── Prometheus-Compatible Response Builders ─────────────────────────────────
// (imported from @/lib/monitoring-transforms)

// ─── VPS Panel Response Transformers ─────────────────────────────────────────
// containersToPrometheus imported from @/lib/monitoring-transforms

export function systemMetricsToPrometheus(
  metrics: VpsPanelSystemMetrics,
  query: string
): object {
  const ts = Math.floor(new Date(metrics.timestamp).getTime() / 1000);

  if (query.includes("node_cpu_seconds_total") || query.includes("cpu")) {
    return prometheusInstant([
      { metric: { __name__: "cpu_usage", job: "node_exporter" }, value: [ts, String(metrics.cpu.usagePercent)] },
    ]);
  }

  // Check MemAvailable BEFORE MemTotal (percentage query contains both)
  if (query.includes("MemAvailable") || (query.includes("node_memory") && !query.includes("MemTotal_bytes"))) {
    const memPct = metrics.memory.totalBytes > 0
      ? (metrics.memory.usedBytes / metrics.memory.totalBytes) * 100
      : 0;
    return prometheusInstant([
      { metric: { __name__: "memory_usage_percent" }, value: [ts, String(memPct)] },
    ]);
  }

  if (query.includes("MemTotal") || query.includes("Total_bytes")) {
    return prometheusInstant([
      { metric: { __name__: "node_memory_MemTotal_bytes" }, value: [ts, String(metrics.memory.totalBytes)] },
    ]);
  }

  if (query.includes("memory")) {
    const memPct = metrics.memory.totalBytes > 0
      ? (metrics.memory.usedBytes / metrics.memory.totalBytes) * 100
      : 0;
    return prometheusInstant([
      { metric: { __name__: "memory_usage_percent" }, value: [ts, String(memPct)] },
    ]);
  }

  if (query.includes("node_filesystem") || query.includes("disk")) {
    const diskPct = metrics.disk.totalBytes > 0
      ? (metrics.disk.usedBytes / metrics.disk.totalBytes) * 100
      : 0;
    return prometheusInstant([
      { metric: { __name__: "disk_usage_percent" }, value: [ts, String(diskPct)] },
    ]);
  }

  if (query.includes("node_network_receive") || query.includes("network")) {
    return prometheusInstant([
      { metric: { __name__: "node_network_receive_bytes_total", interface: "eth0" }, value: [ts, String(metrics.network.rxBytesPerSec)] },
    ]);
  }

  if (query.includes("node_disk_read")) {
    return prometheusInstant([
      { metric: { __name__: "node_disk_read_bytes_total" }, value: [ts, "0"] },
    ]);
  }

  if (query.includes("up{") || query.includes("service_health")) {
    return prometheusInstant([]);
  }

  // Default fallback
  return prometheusInstant([
    { metric: { __name__: "cpu_usage" }, value: [ts, String(metrics.cpu.usagePercent)] },
  ]);
}

function projectMetricsToPrometheus(
  project: VpsPanelProjectMetrics,
  query: string,
  userId?: string
): object {
  const ts = Math.floor(new Date(project.timestamp).getTime() / 1000);

  if (query.includes("cpu")) {
    if (userId) {
      return prometheusInstant([
        { metric: { __name__: "avry_user_cpu_seconds_total", user_id: userId, user_tier: "paid" }, value: [ts, String(project.cpu.usagePercent)] },
      ]);
    }
    return prometheusInstant([
      { metric: { __name__: "cpu_usage", project: project.projectId }, value: [ts, String(project.cpu.usagePercent)] },
    ]);
  }

  if (query.includes("memory") || query.includes("rss")) {
    if (userId) {
      return prometheusInstant([
        { metric: { __name__: "avry_user_memory_rss_bytes", user_id: userId }, value: [ts, String(project.memory.usedBytes)] },
      ]);
    }
    return prometheusInstant([
      { metric: { __name__: "memory_usage", project: project.projectId }, value: [ts, String(project.memory.usedBytes)] },
    ]);
  }

  if (query.includes("network_receive")) {
    if (userId) {
      return prometheusInstant([
        { metric: { __name__: "avry_user_network_receive_bytes_total", user_id: userId }, value: [ts, String(project.network.rxBytes)] },
      ]);
    }
    return prometheusInstant([
      { metric: { __name__: "network_receive", project: project.projectId }, value: [ts, String(project.network.rxBytes)] },
    ]);
  }

  if (query.includes("network_transmit")) {
    if (userId) {
      return prometheusInstant([
        { metric: { __name__: "avry_user_network_transmit_bytes_total", user_id: userId }, value: [ts, String(project.network.txBytes)] },
      ]);
    }
    return prometheusInstant([
      { metric: { __name__: "network_transmit", project: project.projectId }, value: [ts, String(project.network.txBytes)] },
    ]);
  }

  // Default: CPU
  return prometheusInstant([
    { metric: { __name__: "cpu_usage", project: project.projectId }, value: [ts, String(project.cpu.usagePercent)] },
  ]);
}

function historyToPrometheusRange(
  history: VpsPanelHistoryPoint[],
  query: string
): object {
  if (!history || history.length === 0) {
    return prometheusRange([]);
  }

  let values: [number, string][];

  if (query.includes("node_cpu_seconds_total") || query.includes("cpu")) {
    values = history.map((p) => [
      Math.floor(new Date(p.timestamp).getTime() / 1000),
      String(p.cpu.usagePercent),
    ]);
  } else if (query.includes("node_memory") || query.includes("memory")) {
    values = history.map((p) => {
      const pct = p.memory.totalBytes > 0
        ? (p.memory.usedBytes / p.memory.totalBytes) * 100
        : 0;
      return [Math.floor(new Date(p.timestamp).getTime() / 1000), String(pct)];
    });
  } else if (query.includes("node_filesystem") || query.includes("disk")) {
    values = history.map((p) => {
      const pct = p.disk.totalBytes > 0
        ? (p.disk.usedBytes / p.disk.totalBytes) * 100
        : 0;
      return [Math.floor(new Date(p.timestamp).getTime() / 1000), String(pct)];
    });
  } else if (query.includes("node_network_receive") || query.includes("network")) {
    values = history.map((p) => [
      Math.floor(new Date(p.timestamp).getTime() / 1000),
      String(p.network.rxBytesPerSec),
    ]);
  } else if (query.includes("node_disk_read")) {
    values = history.map((p) => [
      Math.floor(new Date(p.timestamp).getTime() / 1000),
      "0",
    ]);
  } else {
    values = history.map((p) => [
      Math.floor(new Date(p.timestamp).getTime() / 1000),
      String(p.cpu.usagePercent),
    ]);
  }

  const metricName = extractMetricName(query);
  return prometheusRange([
    { metric: { __name__: metricName }, values },
  ]);
}

function extractMetricName(query: string): string {
  const match = query.match(/([a-zA-Z_:][a-zA-Z0-9_:]*)/);
  return match ? match[1] : "metric";
}

// ─── Resolution Mapping ──────────────────────────────────────────────────────

function stepToResolution(step: string | null): string | undefined {
  if (!step) return "5m"; // default to 5m which is the most common stored resolution
  const stepSeconds = parseStepToSeconds(step);
  if (stepSeconds <= 300) return "5m";
  if (stepSeconds <= 900) return "5m";
  return "1h";
}

function parseStepToSeconds(step: string): number {
  const match = step.match(/^(\d+)([smh]?)$/);
  if (!match) return 60;
  const value = parseInt(match[1], 10);
  const unit = match[2] || "s";
  switch (unit) {
    case "m": return value * 60;
    case "h": return value * 3600;
    default: return value;
  }
}

// ─── Unix <-> ISO Conversion ─────────────────────────────────────────────────

function unixToIso(value: string): string {
  if (/^\d{9,10}$/.test(value)) {
    return new Date(parseInt(value, 10) * 1000).toISOString();
  }
  if (/^\d{12,13}$/.test(value)) {
    return new Date(parseInt(value, 10)).toISOString();
  }
  return value;
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Validate admin/superadmin role from cookie
  const token = request.cookies.get("aivory_access_token")?.value;
  const auth = validateAdminToken(token);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const query = searchParams.get("query");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const step = searchParams.get("step");
  const resolution = searchParams.get("resolution");
  const userId = searchParams.get("userId");

  // 3. Validate userId if provided (prevent injection)
  if (userId && !isValidUserId(userId)) {
    return NextResponse.json(
      { error: "Invalid userId format" },
      { status: 400 }
    );
  }

  // 4. Determine request mode
  const mode = getRequestMode(type);

  if (mode === "vps-panel") {
    // ─── Direct VPS Panel Mode ─────────────────────────────────────────
    return handleVpsPanelDirect(type as VpsPanelRequestType, {
      query,
      start,
      end,
      step,
      resolution,
      userId,
    });
  }

  // ─── Legacy Prometheus-Compatible Mode ─────────────────────────────────
  // Requires a `query` parameter (like the old Prometheus proxy)
  if (!query) {
    return NextResponse.json(
      { error: "Missing required parameter: query" },
      { status: 400 }
    );
  }

  return handleLegacyQuery(type, query, { start, end, step, userId });
}

// ─── Direct VPS Panel Handler ────────────────────────────────────────────────

export async function handleVpsPanelDirect(
  requestType: VpsPanelRequestType,
  params: {
    query: string | null;
    start: string | null;
    end: string | null;
    step: string | null;
    resolution: string | null;
    userId: string | null;
    format?: string | null;
  }
): Promise<NextResponse> {
  try {
    switch (requestType) {
      case "system": {
        const res = await fetchVpsPanel("/api/monitoring/system");
        if (!res.ok) return handleUpstreamError(res);
        const body = await res.json();

        // If already Prometheus format (e.g., during migration), pass through
        if (isPrometheusFormat(body)) {
          return NextResponse.json(body);
        }

        // VPS Panel envelope format
        if (isVpsPanelEnvelope(body)) {
          const envelope = body as VpsPanelEnvelope<VpsPanelSystemMetrics>;
          if (!envelope.success) {
            return NextResponse.json(
              { error: envelope.error || "VPS Panel error", code: envelope.code },
              { status: 502 }
            );
          }
          if (params.format !== "prometheus") {
            return NextResponse.json(envelope.data);
          }
          const transformed = systemMetricsToPrometheus(envelope.data, params.query || "");
          return NextResponse.json(transformed);
        }

        // Unknown format — return as-is
        return NextResponse.json(body);
      }

      case "project": {
        const queryParams = new URLSearchParams();
        if (params.userId) queryParams.set("user_id", params.userId);
        const res = await fetchVpsPanel(
          "/api/monitoring/projects/avry-v2-main",
          queryParams.toString() ? queryParams : undefined
        );
        if (!res.ok) return handleUpstreamError(res);
        const body = await res.json();

        if (isPrometheusFormat(body)) {
          return NextResponse.json(body);
        }

        if (isVpsPanelEnvelope(body)) {
          const envelope = body as VpsPanelEnvelope<VpsPanelProjectMetrics>;
          if (!envelope.success) {
            return NextResponse.json(
              { error: envelope.error || "VPS Panel error", code: envelope.code },
              { status: 502 }
            );
          }
          const transformed = projectMetricsToPrometheus(
            envelope.data,
            params.query || "",
            params.userId || undefined
          );
          return NextResponse.json(transformed);
        }

        return NextResponse.json(body);
      }

      case "history": {
        const queryParams = new URLSearchParams();
        if (params.start) queryParams.set("start", unixToIso(params.start));
        if (params.end) queryParams.set("end", unixToIso(params.end));
        const resolvedResolution = params.resolution || stepToResolution(params.step);
        if (resolvedResolution) queryParams.set("resolution", resolvedResolution);

        const res = await fetchVpsPanel("/api/monitoring/history", queryParams);
        if (!res.ok) return handleUpstreamError(res);
        const body = await res.json();

        if (isPrometheusFormat(body)) {
          return NextResponse.json(body);
        }

        if (isVpsPanelEnvelope(body)) {
          const envelope = body as VpsPanelEnvelope<VpsPanelHistoryPoint[]>;
          if (!envelope.success) {
            return NextResponse.json(
              { error: envelope.error || "VPS Panel error", code: envelope.code },
              { status: 502 }
            );
          }
          const transformed = historyToPrometheusRange(envelope.data, params.query || "");
          return NextResponse.json(transformed);
        }

        return NextResponse.json(body);
      }

      case "containers": {
        const res = await fetchVpsPanel("/api/monitoring/containers");
        if (!res.ok) return handleUpstreamError(res);
        const body = await res.json();

        if (isPrometheusFormat(body)) {
          return NextResponse.json(body);
        }

        if (isVpsPanelEnvelope(body)) {
          const envelope = body as VpsPanelEnvelope<Array<{ name: string; state?: string; status?: string }>>;
          if (!envelope.success) {
            return NextResponse.json(
              { error: envelope.error || "VPS Panel error", code: envelope.code },
              { status: 502 }
            );
          }
          if (params.format === "raw") {
            return NextResponse.json(envelope.data);
          }
          return NextResponse.json(containersToPrometheus(envelope.data));
        }

        // If raw array (no envelope), transform directly
        if (Array.isArray(body)) {
          if (params.format === "raw") return NextResponse.json(body);
          return NextResponse.json(containersToPrometheus(body));
        }

        return NextResponse.json(body);
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Monitoring service unavailable" },
      { status: 503 }
    );
  }
}

// ─── Legacy Prometheus-Compatible Handler ────────────────────────────────────

async function handleLegacyQuery(
  type: string | null,
  query: string,
  params: {
    start: string | null;
    end: string | null;
    step: string | null;
    userId: string | null;
  }
): Promise<NextResponse> {
  const isRangeQuery = type === "range";
  const target = determineVpsPanelTarget(query, params.userId);

  try {
    if (isRangeQuery) {
      // Range queries → VPS Panel history endpoint
      const queryParams = new URLSearchParams();
      if (params.start) queryParams.set("start", unixToIso(params.start));
      if (params.end) queryParams.set("end", unixToIso(params.end));
      const resolvedResolution = stepToResolution(params.step);
      if (resolvedResolution) queryParams.set("resolution", resolvedResolution);
      if (params.userId) queryParams.set("user_id", params.userId);

      const res = await fetchVpsPanel("/api/monitoring/history", queryParams);
      if (!res.ok) return handleUpstreamError(res);
      const body = await res.json();

      if (isPrometheusFormat(body)) {
        return NextResponse.json(body);
      }
      if (isVpsPanelEnvelope(body)) {
        const envelope = body as VpsPanelEnvelope<VpsPanelHistoryPoint[]>;
        if (!envelope.success) {
          return NextResponse.json(
            { error: envelope.error || "VPS Panel error", code: envelope.code },
            { status: 502 }
          );
        }
        return NextResponse.json(historyToPrometheusRange(envelope.data, query));
      }
      return NextResponse.json(body);
    }

    // Instant queries → system, project, or containers endpoint
    if (target === "containers") {
      const res = await fetchVpsPanel("/api/monitoring/containers");
      if (!res.ok) return handleUpstreamError(res);
      const body = await res.json();

      if (isPrometheusFormat(body)) {
        return NextResponse.json(body);
      }

      if (isVpsPanelEnvelope(body)) {
        const envelope = body as VpsPanelEnvelope<Array<{ name: string; state?: string; status?: string }>>;
        if (!envelope.success) {
          return NextResponse.json(
            { error: envelope.error || "VPS Panel error", code: envelope.code },
            { status: 502 }
          );
        }
        return NextResponse.json(containersToPrometheus(envelope.data));
      }

      // If raw array (no envelope), transform directly
      if (Array.isArray(body)) {
        return NextResponse.json(containersToPrometheus(body));
      }

      return NextResponse.json(body);
    }

    if (target === "project") {
      const queryParams = new URLSearchParams();
      if (params.userId) queryParams.set("user_id", params.userId);

      const res = await fetchVpsPanel(
        "/api/monitoring/projects/avry-v2-main",
        queryParams.toString() ? queryParams : undefined
      );
      if (!res.ok) return handleUpstreamError(res);
      const body = await res.json();

      if (isPrometheusFormat(body)) {
        return NextResponse.json(body);
      }
      if (isVpsPanelEnvelope(body)) {
        const envelope = body as VpsPanelEnvelope<VpsPanelProjectMetrics>;
        if (!envelope.success) {
          return NextResponse.json(
            { error: envelope.error || "VPS Panel error", code: envelope.code },
            { status: 502 }
          );
        }
        return NextResponse.json(
          projectMetricsToPrometheus(envelope.data, query, params.userId || undefined)
        );
      }
      return NextResponse.json(body);
    }

    // System metrics
    const res = await fetchVpsPanel("/api/monitoring/system");
    if (!res.ok) return handleUpstreamError(res);
    const body = await res.json();

    if (isPrometheusFormat(body)) {
      return NextResponse.json(body);
    }
    if (isVpsPanelEnvelope(body)) {
      const envelope = body as VpsPanelEnvelope<VpsPanelSystemMetrics>;
      if (!envelope.success) {
        return NextResponse.json(
          { error: envelope.error || "VPS Panel error", code: envelope.code },
          { status: 502 }
        );
      }
      return NextResponse.json(systemMetricsToPrometheus(envelope.data, query));
    }
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Monitoring service unavailable" },
      { status: 503 }
    );
  }
}

// ─── Error Handling ──────────────────────────────────────────────────────────

function handleUpstreamError(res: Response): NextResponse {
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json(
      { error: "VPS Panel authentication failed" },
      { status: 502 }
    );
  }
  if (res.status === 404) {
    // Project/resource not found — return empty Prometheus result
    return NextResponse.json(
      prometheusInstant([])
    );
  }
  if (res.status === 503) {
    return NextResponse.json(
      { error: "Monitoring service unavailable" },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { error: `VPS Panel returned ${res.status}` },
    { status: 502 }
  );
}
