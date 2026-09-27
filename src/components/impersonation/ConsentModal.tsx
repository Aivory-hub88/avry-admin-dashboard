"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Shield, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TargetUser {
  userId: string;
  email: string;
}

interface ConsentModalProps {
  isOpen: boolean;
  targetUser: TargetUser;
  onClose: () => void;
  onSuccess?: (session: ImpersonationStartResponse) => void;
}

interface ImpersonationStartResponse {
  session_id: string;
  target_user_id: string;
  target_email: string;
  access_mode: string;
  expires_at: string;
  started_at: string;
}

type AccessMode = "read_only" | "full_access";

/**
 * ConsentModal — Displays a monitoring warning and collects confirmation
 * before starting an impersonation session.
 *
 * - Shows the monitoring warning message
 * - Displays target user email and user ID
 * - Provides Access_Mode selector (Read-Only default, Full Access option)
 * - Confirm sends POST /api/v1/impersonation/start
 * - Cancel closes modal with no side effects
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export function ConsentModal({
  isOpen,
  targetUser,
  onClose,
  onSuccess,
}: ConsentModalProps) {
  const [accessMode, setAccessMode] = useState<AccessMode>("read_only");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch<ImpersonationStartResponse>(
        "/api/v1/impersonation/start",
        {
          method: "POST",
          body: JSON.stringify({
            target_user_id: targetUser.userId,
            access_mode: accessMode,
          }),
        }
      );

      handleReset();
      onClose();
      onSuccess?.(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start impersonation session"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAccessMode("read_only");
    setError("");
    setLoading(false);
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1e1e20] p-6 shadow-2xl">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-white"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-orange-500/15 p-2">
            <AlertTriangle className="text-orange-400" size={24} />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Start Impersonation
          </h2>
        </div>

        {/* Monitoring Warning */}
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-200">
            This impersonation session will be fully monitored and logged for
            compliance purposes
          </p>
        </div>

        {/* Target User Info */}
        <div className="mb-4 rounded-md border border-white/10 bg-[#2a2a27] p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-200">
            Target User
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Email:</span>
              <span className="font-medium text-white">
                {targetUser.email}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">User ID:</span>
              <span className="font-mono text-white">
                {targetUser.userId}
              </span>
            </div>
          </div>
        </div>

        {/* Access Mode Selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Access Mode
          </label>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-[#2a2a27] p-3 transition-colors hover:bg-white/5">
              <input
                type="radio"
                name="accessMode"
                value="read_only"
                checked={accessMode === "read_only"}
                onChange={() => setAccessMode("read_only")}
                className="accent-[#b7cba6] focus:ring-[#b7cba6]/50"
              />
              <Eye size={18} className="text-blue-600" />
              <div>
                <span className="text-sm font-medium text-white">
                  Read-Only
                </span>
                <p className="text-xs text-gray-400">
                  Observe only — all write operations will be blocked
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-[#2a2a27] p-3 transition-colors hover:bg-white/5">
              <input
                type="radio"
                name="accessMode"
                value="full_access"
                checked={accessMode === "full_access"}
                onChange={() => setAccessMode("full_access")}
                className="accent-[#b7cba6] focus:ring-[#b7cba6]/50"
              />
              <Shield size={18} className="text-orange-400" />
              <div>
                <span className="text-sm font-medium text-white">
                  Full Access
                </span>
                <p className="text-xs text-gray-400">
                  Can perform non-destructive actions as this user
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded bg-red-500/10 p-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-md border border-white/15 px-4 py-2 text-gray-200 transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-md bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Starting..." : "Confirm Impersonation"}
          </button>
        </div>
      </div>
    </div>
  );
}
