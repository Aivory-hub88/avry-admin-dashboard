"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  decodeJwt,
  AivoryJwtPayload,
  isTokenExpired,
  getAccountType,
  getFullName,
  getUserId,
} from "@/lib/jwt";
import { getCookie, deleteCookie } from "@/lib/cookies";

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
    const token = getCookie("aivory_access_token");
    if (token) {
      try {
        const payload: AivoryJwtPayload = decodeJwt(token);
        const accountType = getAccountType(payload);

        if (
          !isTokenExpired(payload) &&
          (accountType === "superadmin" || accountType === "admin")
        ) {
          // getFullName already falls back to the email prefix, so fullName
          // will always be a non-empty string when email is present.
          const resolvedFullName =
            getFullName(payload) ??
            (payload.email ? payload.email.split("@")[0] : "Admin");

          setUser({
            userId: getUserId(payload),
            email: payload.email,
            accountType: accountType as "superadmin" | "admin",
            fullName: resolvedFullName,
          });
        }
      } catch {
        // invalid token — ignore
      }
    }
    setIsLoading(false);
  }, []);

  const logout = async () => {
    const refreshToken = getCookie("aivory_refresh_token");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
      });
    } catch {
      // ignore logout errors — clear cookies regardless
    } finally {
      deleteCookie("aivory_access_token");
      deleteCookie("aivory_refresh_token");
      setUser(null);
      window.location.href = "/login";
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
