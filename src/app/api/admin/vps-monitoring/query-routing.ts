/**
 * VPS Panel query routing utility.
 *
 * Determines which VPS Panel endpoint a given Prometheus-style query
 * should be routed to based on keywords in the query string.
 */

export type VpsPanelRequestType = "system" | "project" | "history" | "containers";

/**
 * Determine which VPS Panel endpoint to target based on the query string.
 *
 * - Queries containing "up{" or "service_health" → containers endpoint
 * - Queries with a userId or user-related prefixes → project endpoint
 * - All other queries → system endpoint
 */
export function determineVpsPanelTarget(
  query: string,
  userId?: string | null
): VpsPanelRequestType {
  // Service health queries route to containers endpoint
  if (query.includes("up{") || query.includes("service_health")) {
    return "containers";
  }
  if (userId || query.includes("avry_user_") || query.includes("user_")) {
    return "project";
  }
  return "system";
}
