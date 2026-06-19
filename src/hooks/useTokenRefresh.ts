"use client";
import { useEffect } from "react";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import { decodeJwt, isTokenExpiringSoon } from "@/lib/jwt";

export function useTokenRefresh() {
  useEffect(() => {
    const checkAndRefresh = async () => {
      const token = getCookie("aivory_access_token");
      if (!token) return;

      try {
        const payload = decodeJwt(token);
        if (isTokenExpiringSoon(payload, 60)) {
          const refreshToken = getCookie("aivory_refresh_token");
          if (!refreshToken) {
            deleteCookie("aivory_access_token");
            window.location.href = "/admin/signin";
            return;
          }

          const res = await fetch("/admin/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (res.ok) {
            const data = await res.json();
            setCookie("aivory_access_token", data.access_token, {
              maxAge: 3600,
              path: "/",
              sameSite: "Lax",
            });
          } else {
            deleteCookie("aivory_access_token");
            deleteCookie("aivory_refresh_token");
            window.location.href = "/admin/signin";
          }
        }
      } catch {
        // ignore decode errors
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 30_000);
    return () => clearInterval(interval);
  }, []);
}
