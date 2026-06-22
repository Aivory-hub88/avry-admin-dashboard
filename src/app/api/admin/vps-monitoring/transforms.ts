/**
 * VPS Panel → Prometheus transformation utilities.
 *
 * Extracted from the BFF route handler for testability.
 * These pure functions convert VPS Panel envelope data into
 * Prometheus-compatible response formats.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VpsPanelSystemMetrics {
  cpu: { usagePercent: number };
  memory: { usedBytes: number; totalBytes: number };
  disk: { usedBytes: number; totalBytes: number };
  network: { rxBytesPerSec: number; txBytesPerSec: number };
  timestamp: string;
}

export interface PrometheusInstantResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function prometheusInstant(
  result: Array<{ metric: Record<string, string>; value: [number, string] }>
): PrometheusInstantResult {
  return {
    status: "success",
    data: {
      resultType: "vector",
      result,
    },
  };
}

// ─── System Metrics Transformer ──────────────────────────────────────────────

/**
 * Transform VPS Panel system metrics into Prometheus-compatible instant vector format.
 *
 * Routes to different metric formats based on the query string:
 * - cpu/node_cpu_seconds_total → cpu_usage
 * - memory/node_memory/MemAvailable → memory_usage_percent
 * - disk/node_filesystem → disk_usage_percent
 * - network/node_network_receive → node_network_receive_bytes_total
 * - Default fallback → cpu_usage
 */
export function systemMetricsToPrometheus(
  metrics: VpsPanelSystemMetrics,
  query: string
): PrometheusInstantResult {
  const ts = Math.floor(new Date(metrics.timestamp).getTime() / 1000);

  if (query.includes("node_cpu_seconds_total") || query.includes("cpu")) {
    return prometheusInstant([
      { metric: { __name__: "cpu_usage", job: "node_exporter" }, value: [ts, String(metrics.cpu.usagePercent)] },
    ]);
  }

  if (query.includes("MemTotal") || query.includes("Total_bytes")) {
    return prometheusInstant([
      { metric: { __name__: "node_memory_MemTotal_bytes" }, value: [ts, String(metrics.memory.totalBytes)] },
    ]);
  }

  if (query.includes("node_memory") || query.includes("memory") || query.includes("MemAvailable")) {
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
