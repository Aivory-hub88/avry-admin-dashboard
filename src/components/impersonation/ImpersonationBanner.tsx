"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Eye, LogOut, Clock, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

interface ImpersonationStatus {
  active: boolean;
  session_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  access_mode: string | null;
  expires_at: string | null;
  remaining_seconds: number | null;
}

/**
 * ImpersonationBanner — Fixed-position banner at viewport top displayed during
 * an active impersonation session.
 *
 * - Shows "Viewing as [Target_User email]" and a countdown timer
 * - Prominent "End Impersonation" button (POST /api/v1/impersonation/end)
 * - Warning orange/yellow color scheme distinct from normal UI
 * - "READ-ONLY" badge when access_mode is "read_only"
 * - Polls GET /api/v1/impersonation/status every 15 seconds to update countdown
 * - On session end, redirects admin to the admin dashboard Users page
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2
 */
export function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasActiveRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    // Don't poll if user is not authenticated
    const token = getCookie("aivory_access_token");
    if (!token) return;

    try {
      const data = await apiFetch<ImpersonationStatus>(
        "/api/v1/impersonation/status"
      );

      if (!data.active) {
        // Only redirect if impersonation was previously active and has now ended
        if (wasActiveRef.current) {
          wasActiveRef.current = false;
          clearIntervals();
          setStatus(null);
          setRemainingSeconds(null);
          window.location.href = "/admin/dashboard/users";
          return;
        }
        // No active session and never was — just do nothing
        setStatus(null);
        setRemainingSeconds(null);
        return;
      }

      wasActiveRef.current = true;
      setStatus(data);
      setRemainingSeconds(data.remaining_seconds);
      setError("");
    } catch {
      // Silently handle poll failures — don't disrupt the admin
      // If the session was terminated server-side, next poll will redirect
    }
  }, []);

  const clearIntervals = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchStatus();

    // Poll status endpoint every 15 seconds
    pollIntervalRef.current = setInterval(fetchStatus, 15_000);

    return () => clearIntervals();
  }, [fetchStatus, clearIntervals]);

  // Local countdown timer (decrements every second between polls)
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 0) return 0;
        const next = prev - 1;
        if (next <= 0) {
          // Session expired locally — trigger a status check
          fetchStatus();
          return 0;
        }
        return next;
      });
    }, 1_000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [status, fetchStatus]);

  const handleEndImpersonation = async () => {
    setEnding(true);
    setError("");

    try {
      await apiFetch("/api/v1/impersonation/end", { method: "POST" });
      clearIntervals();
      window.location.href = "/admin/dashboard/users";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to end impersonation session"
      );
      setEnding(false);
    }
  };

  const formatCountdown = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Don't render banner if no active session
  if (!status || !status.active) return null;

  const isReadOnly = status.access_mode === "read_only";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-4 border-b-2 border-orange-500 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 shadow-lg"
      role="alert"
      aria-live="polite"
      aria-label="Impersonation session active"
    >
      {/* Left: session info */}
      <div className="flex items-center gap-3">
        <ShieldAlert size={20} className="text-white shrink-0" />
        <span className="text-sm font-semibold text-white">
          Viewing as{" "}
          <span className="font-bold underline decoration-white/60">
            {status.target_email}
          </span>
        </span>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase text-white border border-white/40">
            <Eye size={12} />
            READ-ONLY
          </span>
        )}
      </div>

      {/* Center: countdown */}
      <div className="flex items-center gap-2 text-sm text-white/90">
        <Clock size={16} className="text-white" />
        <span className="font-mono font-medium tabular-nums">
          {formatCountdown(remainingSeconds)}
        </span>
        <span className="hidden sm:inline text-white/70">remaining</span>
      </div>

      {/* Right: end button + error */}
      <div className="flex items-center gap-3">
        {error && (
          <span className="text-xs text-red-100 bg-red-600/40 px-2 py-0.5 rounded">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={handleEndImpersonation}
          disabled={ending}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="End impersonation session"
        >
          <LogOut size={14} />
          {ending ? "Ending..." : "End Impersonation"}
        </button>
      </div>
    </div>
  );
}
