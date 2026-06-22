/**
 * Pure transformation functions for converting VPS Panel data
 * into Prometheus-compatible metric format.
 *
 * Extracted from the BFF route for testability.
 */

// ─── Prometheus-Compatible Response Builders ─────────────────────────────────

export function prometheusInstant(
  result: Array<{ metric: Record<string, string>; value: [number, string] }>
): object {
  return {
    status: "success",
    data: {
      resultType: "vector",
      result,
    },
  };
}

export function prometheusRange(
  result: Array<{ metric: Record<string, string>; values: [number, string][] }>
): object {
  return {
    status: "success",
    data: {
      resultType: "matrix",
      result,
    },
  };
}

// ─── Container State to Prometheus Metric Transformation ─────────────────────

/**
 * Transform VPS Panel container states into Prometheus-compatible up/down metrics.
 * Maps container "running" state to value "1", any other state to value "0".
 * Uses container name as the `instance` label and "up" as `__name__`.
 */
export function containersToPrometheus(
  containers: Array<{ name: string; state?: string; status?: string }>
): object {
  const ts = Math.floor(Date.now() / 1000);
  return prometheusInstant(
    containers.map((c) => ({
      metric: { __name__: "up", instance: c.name },
      value: [ts, (c.state ?? c.status) === "running" ? "1" : "0"] as [number, string],
    }))
  );
}
