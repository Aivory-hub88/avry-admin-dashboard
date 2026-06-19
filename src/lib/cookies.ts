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
  
  // Only set domain if explicitly provided
  if (options.domain) {
    cookie += `; domain=${options.domain}`;
  }
  
  // Default to SameSite=Lax (works with HTTP IP access)
  cookie += `; SameSite=${options.sameSite ?? "Lax"}`;
  
  // Only add Secure flag if explicitly requested
  if (options.secure) {
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
