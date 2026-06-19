/**
 * Microservice base URLs.
 *
 * Server-side runtime env vars (available in API routes / BFF):
 *   BACKEND_SERVICE_URL, BLOG_SERVICE_URL, CAREERS_SERVICE_URL,
 *   DIAGNOSTICS_SERVICE_URL, BLUEPRINT_SERVICE_URL, ROADMAP_SERVICE_URL,
 *   WORKFLOWS_SERVICE_URL, PAYMENTS_SERVICE_URL
 *
 * Falls back to NEXT_PUBLIC_API_URL (baked at build time) for local dev.
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
 * Returns the configured base URL for a service, or null if not configured.
 */
export function getServiceUrl(name: ServiceName): string | null {
  const url = SERVICE_URLS[name];
  return url || null;
}
