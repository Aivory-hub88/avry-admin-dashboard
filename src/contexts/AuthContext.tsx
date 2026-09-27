"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { deleteCookie } from "@/lib/cookies";
import { getRefreshToken, clearLandingSession } from "@/lib/sessionRefresh";
import { bffFetch } from "@/lib/bff";

interface AuthUser {
  userId: string;
  email: string;
  accountType: "superadmin" | "admin";
  fullName?: string;
}

interface AuthState {
  user: AuthUser | null;
  role: "superadmin" | "admin" | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  isLoading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Identity comes from the server, never from client-side cookie parsing:
    // the browser can hold duplicate `aivory_access_token` cookies (host-only
    // vs domain=.aivory.id) and document.cookie may surface a different
    // duplicate than the one the middleware validated, desyncing the UI
    // (null role → superadmin menus hidden, "A" avatar). /api/auth/me
    // inspects every duplicate server-side and returns the valid identity.
    let cancelled = false;
    (async () => {
      try {
        const res = await bffFetch("/api/auth/me");
        if (!cancelled && res.ok) {
          const me = await res.json();
          if (
            me?.accountType === "superadmin" ||
            me?.accountType === "admin"
          ) {
            setUser({
              userId: me.userId ?? "",
              email: me.email ?? "",
              accountType: me.accountType,
              fullName: me.fullName,
            });
          }
        }
      } catch {
        // network error — leave user null; middleware still gates pages
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    // Cookie or the landing's session: whichever this login left behind, so
    // the backend revokes it either way.
    const refreshToken = getRefreshToken();
    try {
      await bffFetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
      });
    } catch {
      // ignore logout errors — clear cookies regardless
    } finally {
      // Delete BOTH variants — the landing page stamps a domain=.aivory.id
      // duplicate that a host-only delete would leave behind.
      for (const name of ["aivory_access_token", "aivory_refresh_token"]) {
        deleteCookie(name);
        deleteCookie(name, { domain: ".aivory.id" });
      }
      // Otherwise the sign-in page would resume the session we just ended.
      clearLandingSession();
      setUser(null);
      window.location.href = "/admin/signin";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role: user?.accountType ?? null, isLoading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
