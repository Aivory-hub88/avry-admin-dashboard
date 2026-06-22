// [SUPABASE MIGRATION] Entire file commented out — auth now handled by VPS backend (avry-backend).
// All routes that previously used supabaseAdmin now forward to BACKEND_SERVICE_URL or return 503.

// import { createClient, SupabaseClient } from "@supabase/supabase-js";
//
// let _admin: SupabaseClient | null = null;
//
// function getAdminClient(): SupabaseClient {
//   if (_admin) return _admin;
//
//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
//
//   if (!supabaseUrl || !serviceRoleKey) {
//     throw new Error(
//       "Missing Supabase admin environment variables: " +
//         "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
//     );
//   }
//
//   _admin = createClient(supabaseUrl, serviceRoleKey, {
//     auth: {
//       persistSession: false,
//       autoRefreshToken: false,
//     },
//   });
//   return _admin;
// }
//
// export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
//   get(_target, prop, receiver) {
//     const client = getAdminClient();
//     const value = Reflect.get(client as object, prop, receiver);
//     return typeof value === "function" ? value.bind(client) : value;
//   },
// });

/**
 * Empty placeholder export to prevent import errors in files that still
 * reference `supabaseAdmin`. All actual Supabase calls have been removed
 * from the route handlers.
 */
export const supabaseAdmin = null as any;
