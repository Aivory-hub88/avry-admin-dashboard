/**
 * Shared module list for demo-account access control. Used by
 * CreateAdminModal (creation) and EditModulesModal (editing an existing
 * demo account). Keep `key` values in sync with VALID_MODULE_KEYS in the
 * backend's app/routes/admin_users.py and DEMO_ALLOWED_NAV_KEYS /
 * MODULE_PATH_PREFIXES in the user dashboard's lib/moduleAccess.ts.
 */

export interface ModuleOption {
  key: string;
  label: string;
}

export const ALL_MODULES: ModuleOption[] = [
  { key: "console", label: "AI Console" },
  { key: "diagnostics", label: "Diagnostics" },
  { key: "blueprint", label: "Blueprint" },
  { key: "roadmap", label: "Roadmap" },
  { key: "workflows", label: "Workflows" },
  { key: "executionLogs", label: "Execution Logs" },
  { key: "integrations", label: "Integrations" },
  { key: "templates", label: "Automation Templates" },
  { key: "agents", label: "Agents" },
  { key: "profile", label: "Overview" },
];

/** Pre-checked for a brand-new demo account — matches the old hardcoded fixed set. */
export const DEFAULT_DEMO_MODULES = ["console", "diagnostics", "blueprint", "roadmap"];

/** The demo account's home/redirect route — always included, can't be unchecked. */
export const HOME_MODULE_KEY = "console";
