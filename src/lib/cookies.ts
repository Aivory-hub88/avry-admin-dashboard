export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options: { 
    maxAge?: number; 
    path?: string; 
    httpOnly?: boolean;
    domain?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  } = {}
): void {
  if (typeof document === "undefined") return;
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
  cookie += `; path=${options.path ?? "/"}`;
  
  // Use provided domain or default to root domain for cross-subdomain access
  cookie += `; domain=${options.domain ?? ".aivory.id"}`;
  
  // Default to SameSite=None;Secure for authentication cookies (cross-domain support)
  // For same-site cookies, explicitly pass sameSite: "Lax" or sameSite: "Strict"
  cookie += `; SameSite=${options.sameSite ?? "None"}`;
  
  // Secure flag is required for SameSite=None
  if (options.secure !== false) {
    cookie += "; Secure";
  }
  
  document.cookie = cookie;
}

export function deleteCookie(name: string, options: { path?: string; domain?: string } = {}): void {
  if (typeof document === "undefined") return;
  let cookie = `${name}=; max-age=0; path=${options.path ?? "/"}`;
  if (options.domain) {
    cookie += `; domain=${options.domain}`;
  }
  document.cookie = cookie;
}
