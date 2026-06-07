/**
 * Shared types + validation helpers for the Automation Templates API.
 * Used by both `app/api/admin/templates/route.ts` and
 * `app/api/admin/templates/[id]/route.ts`.
 *
 * Spec: admin-templates-visitors (Req 2, 4, 5, 8, 10)
 */

export const TEMPLATE_CATEGORIES = [
  "Automation",
  "Data Sync",
  "Notification",
  "AI Agent",
  "Custom",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_STATUSES = ["draft", "published"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory | string;
  tags: string[] | null;
  workflow_json: Record<string, unknown>;
  status: TemplateStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function isPlainJsonObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/**
 * Validate a template create payload.
 * Returns null on success, or `{ error }` with the EARS-compliant error message.
 */
export function validateCreatePayload(
  body: unknown
):
  | {
      name: string;
      category: string;
      workflow_json: Record<string, unknown>;
      description?: string;
      tags?: string[];
      status?: TemplateStatus;
    }
  | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Missing required field: name" };
  }
  const obj = body as Record<string, unknown>;

  // Required: name
  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    return { error: "Missing required field: name" };
  }
  // Required: category
  if (typeof obj.category !== "string" || obj.category === "") {
    return { error: "Missing required field: category" };
  }
  // Required: workflow_json (must be plain object)
  if (obj.workflow_json === undefined || obj.workflow_json === null) {
    return { error: "Missing required field: workflow_json" };
  }
  if (!isPlainJsonObject(obj.workflow_json)) {
    return { error: "workflow_json must be a JSON object" };
  }
  // Optional category validation
  if (!TEMPLATE_CATEGORIES.includes(obj.category as TemplateCategory)) {
    return { error: "Invalid category" };
  }
  // Optional status validation
  if (obj.status !== undefined) {
    if (
      typeof obj.status !== "string" ||
      !TEMPLATE_STATUSES.includes(obj.status as TemplateStatus)
    ) {
      return { error: "status must be 'draft' or 'published'" };
    }
  }
  // Optional tags validation (accept array of strings or omit)
  let tags: string[] | undefined;
  if (obj.tags !== undefined && obj.tags !== null) {
    if (!Array.isArray(obj.tags) || !obj.tags.every((t) => typeof t === "string")) {
      return { error: "tags must be an array of strings" };
    }
    tags = obj.tags as string[];
  }

  return {
    name: obj.name,
    category: obj.category,
    workflow_json: obj.workflow_json as Record<string, unknown>,
    description: typeof obj.description === "string" ? obj.description : undefined,
    tags,
    status: obj.status as TemplateStatus | undefined,
  };
}

/**
 * Validate a template update (PATCH) payload.
 * Any subset of fields is allowed; each present field is validated.
 */
export function validateUpdatePayload(
  body: unknown
): { patch: Partial<AutomationTemplate> } | { error: string } {
  if (!body || typeof body !== "object") {
    return { patch: {} };
  }
  const obj = body as Record<string, unknown>;
  const patch: Partial<AutomationTemplate> = {};

  if (obj.name !== undefined) {
    if (typeof obj.name !== "string") {
      return { error: "name must be a string" };
    }
    patch.name = obj.name;
  }
  if (obj.description !== undefined) {
    if (obj.description !== null && typeof obj.description !== "string") {
      return { error: "description must be a string or null" };
    }
    patch.description = obj.description as string | null;
  }
  if (obj.category !== undefined) {
    if (typeof obj.category !== "string" || !TEMPLATE_CATEGORIES.includes(obj.category as TemplateCategory)) {
      return { error: "Invalid category" };
    }
    patch.category = obj.category;
  }
  if (obj.tags !== undefined) {
    if (obj.tags !== null && (!Array.isArray(obj.tags) || !obj.tags.every((t) => typeof t === "string"))) {
      return { error: "tags must be an array of strings or null" };
    }
    patch.tags = obj.tags as string[] | null;
  }
  if (obj.workflow_json !== undefined) {
    if (!isPlainJsonObject(obj.workflow_json)) {
      return { error: "workflow_json must be a JSON object" };
    }
    patch.workflow_json = obj.workflow_json as Record<string, unknown>;
  }
  if (obj.status !== undefined) {
    if (
      typeof obj.status !== "string" ||
      !TEMPLATE_STATUSES.includes(obj.status as TemplateStatus)
    ) {
      return { error: "status must be 'draft' or 'published'" };
    }
    patch.status = obj.status as TemplateStatus;
  }

  return { patch };
}

/**
 * Parse a comma-separated tags input.
 * Splits by comma, trims each segment, drops empty segments.
 * Idempotent on round-trip (Req 10.9).
 */
export function parseTags(raw: string): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
