/**
 * Microservice base URLs.
 *
 * In the microservices architecture each domain is its own service. The admin
 * dashboard BFF routes call these services directly instead of a single
 * monolith. Each service has a dedicated env var and falls back to the shared
 * NEXT_PUBLIC_API_URL for local/dev convenience.
 *
 * No trailing slash.
 */

const SHARED = process.env.NEXT_PUBLIC_API_URL ?? "";

function svc(specific: string | undefined): string {
  return (specific ?? SHARED ?? "").replace(/\/$/, "");
}

export const SERVICE_URLS = {
  backend: svc(process.env.BACKEND_SERVICE_URL),
  payments: svc(process.env.PAYMENTS_SERVICE_URL),
  diagnostics: svc(process.env.DIAGNOSTICS_SERVICE_URL),
  blueprint: svc(process.env.BLUEPRINT_SERVICE_URL),
  roadmap: svc(process.env.ROADMAP_SERVICE_URL),
  workflows: svc(process.env.WORKFLOWS_SERVICE_URL),
  blog: svc(process.env.BLOG_SERVICE_URL),
  careers: svc(process.env.CAREERS_SERVICE_URL),
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/**
 * Returns the configured base URL for a service, or null if neither a
 * service-specific URL nor the shared API URL is set.
 */
export function getServiceUrl(name: ServiceName): string | null {
  const url = SERVICE_URLS[name];
  return url ? url : null;
}
