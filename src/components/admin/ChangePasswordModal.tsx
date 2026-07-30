"use client";
import { bffFetch } from "@/lib/bff";

import React, { useState } from "react";
import { X, Copy, RefreshCw } from "lucide-react";
import { PasswordStrengthMeter } from "../ui/password-strength-meter/PasswordStrengthMeter";

interface ChangePasswordModalProps {
  isOpen: boolean;
  userId: string;
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Sets a new password for a managed account (used for demo accounts, whose
 * password is meant to be rotated). Sends the chosen password to the backend
 * via POST /api/admin/admin-accounts/{id}/reset-password.
 */
export function ChangePasswordModal({
  isOpen,
  userId,
  userEmail,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
    let next = "";
    for (let i = 0; i < 16; i++) {
      next += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(next);
    setConfirmPassword(next);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  const validate = (): string | null => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain a number";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await bffFetch(
        `/api/admin/admin-accounts/${userId}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || "Failed to change password");
      }
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    setLoading(false);
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1e1e20] p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-1">Change Password</h2>
        <p className="text-sm text-gray-400 mb-4">{userEmail}</p>

        {success ? (
          <div className="text-center py-8 text-[#b7cba6] font-medium">
            ✓ Password changed successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-200">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-1 text-sm text-[#b7cba6] hover:text-[#c8dab8] transition-colors"
                >
                  <RefreshCw size={14} /> Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50 focus:border-[#b7cba6]/50 pr-14"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <PasswordStrengthMeter password={password} />
              {password && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                >
                  <Copy size={14} />
                  {copySuccess ? "Copied!" : "Copy password"}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50 focus:border-[#b7cba6]/50"
                placeholder="Confirm new password"
                required
              />
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-white/15 text-gray-200 rounded-md hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#b7cba6] text-[#14140f] font-medium rounded-md hover:bg-[#c8dab8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
