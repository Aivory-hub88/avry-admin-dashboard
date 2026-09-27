"use client";
import { useEffect } from "react";
import { getCookie, deleteCookie } from "@/lib/cookies";
import { decodeJwt, isTokenExpiringSoon } from "@/lib/jwt";
import { refreshSession, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/sessionRefresh";

export function useTokenRefresh() {
  useEffect(() => {
    const checkAndRefresh = async () => {
      const token = getCookie(ACCESS_COOKIE);
      if (token) {
        try {
          if (!isTokenExpiringSoon(decodeJwt(token), 60)) return;
        } catch {
          // undecodable cookie: fall through and try to replace it
        }
      }
      // Missing, expiring or broken access cookie: refresh from whichever
      // refresh token this session has (see lib/sessionRefresh).
      const result = await refreshSession();
      if (result === "rejected" || (result === "no-refresh-token" && !token)) {
        deleteCookie(ACCESS_COOKIE);
        deleteCookie(REFRESH_COOKIE);
        window.location.href = "/admin/signin";
      }
      // "unavailable": keep the current session and try again next tick.
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 30_000);
    return () => clearInterval(interval);
  }, []);
}
