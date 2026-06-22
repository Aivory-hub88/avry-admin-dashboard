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
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
            <AlertTriangle className="text-orange-600" size={24} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Start Impersonation
          </h2>
        </div>

        {/* Monitoring Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md p-3 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            This impersonation session will be fully monitored and logged for
            compliance purposes
          </p>
        </div>

        {/* Target User Info */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target User
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Email:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {targetUser.email}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">User ID:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {targetUser.userId}
              </span>
            </div>
          </div>
        </div>

        {/* Access Mode Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Access Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="radio"
                name="accessMode"
                value="read_only"
                checked={accessMode === "read_only"}
                onChange={() => setAccessMode("read_only")}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Eye size={18} className="text-blue-600" />
              <div>
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  Read-Only
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Observe only — all write operations will be blocked
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="radio"
                name="accessMode"
                value="full_access"
                checked={accessMode === "full_access"}
                onChange={() => setAccessMode("full_access")}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Shield size={18} className="text-orange-600" />
              <div>
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  Full Access
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Can perform non-destructive actions as this user
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Confirm Impersonation"}
          </button>
        </div>
      </div>
    </div>
  );
}
