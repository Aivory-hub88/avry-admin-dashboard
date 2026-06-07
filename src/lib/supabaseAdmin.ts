/**
 * Supabase Admin client — server-side only.
 * Uses the service role key which bypasses Row Level Security.
 * NEVER import this file in client components or expose it to the browser.
 *
 * The client is created lazily on first use so that importing this module
 * during build-time page-data collection (when env vars may be absent) never
 * triggers `createClient` and never throws.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (_admin) return _admin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables: " +
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  _admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _admin;
}

/**
 * Proxy that forwards property access to the lazily-created admin client. This
 * keeps `supabaseAdmin.auth.admin.createUser(...)` call sites unchanged while
 * deferring creation (and the env-var check) until first use at runtime.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAdminClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
