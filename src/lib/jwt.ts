import { jwtDecode } from "jwt-decode";

/**
 * Supabase JWT payload shape.
 * - `sub` is the Supabase user UUID
 * - `email` is the user's email (top-level claim in Supabase JWTs)
 * - `user_metadata` contains custom fields set at signup / via admin API
 * - `app_metadata` contains fields set via the Supabase service-role API
 *
 * We also support the legacy flat payload shape (from the mock auth route)
 * so the client works in both dev and production.
 */
export interface AivoryJwtPayload {
  // Supabase standard claims
  sub?: string;
  email: string;
  user_metadata?: {
    account_type?: string;
    // full_name may be stored under any of these keys depending on how the
    // user was created (Supabase dashboard, API, or OAuth provider).
    full_name?: string;
    name?: string;
    display_name?: string;
  };
  // app_metadata is set via the Supabase service-role API and is a common
  // alternative location for account_type.
  app_metadata?: {
    account_type?: string;
    full_name?: string;
    name?: string;
  };

  // Legacy flat claims (mock auth / old Aivory backend)
  user_id?: string;
  account_type?: string;
  full_name?: string;
  name?: string;

  exp: number;
  iat: number;
}

export function decodeJwt(token: string): AivoryJwtPayload {
  return jwtDecode<AivoryJwtPayload>(token);
}

/**
 * Resolve account_type from either Supabase user_metadata, app_metadata,
 * or legacy flat claim.
 */
export function getAccountType(
  payload: AivoryJwtPayload
): string | undefined {
  return (
    payload.user_metadata?.account_type ??
    payload.app_metadata?.account_type ??
    payload.account_type
  );
}

/**
 * Resolve full_name from Supabase user_metadata (checking multiple common
 * field names), app_metadata, legacy flat claim, or fall back to the email
 * prefix so the UI always has something to display.
 */
export function getFullName(payload: AivoryJwtPayload): string | undefined {
  return (
    payload.user_metadata?.full_name ??
    payload.user_metadata?.name ??
    payload.user_metadata?.display_name ??
    payload.app_metadata?.full_name ??
    payload.app_metadata?.name ??
    payload.full_name ??
    payload.name ??
    // Fall back to the email prefix so the UI always shows something.
    (payload.email ? payload.email.split("@")[0] : undefined)
  );
}

/**
 * Resolve user ID from either Supabase `sub` or legacy `user_id`.
 */
export function getUserId(payload: AivoryJwtPayload): string {
  return payload.sub ?? payload.user_id ?? "";
}

export function isTokenExpired(payload: AivoryJwtPayload): boolean {
  return payload.exp * 1000 < Date.now();
}

export function isTokenExpiringSoon(
  payload: AivoryJwtPayload,
  thresholdSeconds = 60
): boolean {
  return payload.exp * 1000 - Date.now() < thresholdSeconds * 1000;
}
