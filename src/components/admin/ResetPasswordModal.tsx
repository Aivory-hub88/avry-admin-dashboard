"use client";

import React, { useState } from "react";
import { X, Copy, RefreshCw, Mail, KeyRound } from "lucide-react";
import { bffFetch } from "@/lib/bff";
import { PasswordStrengthMeter } from "../ui/password-strength-meter/PasswordStrengthMeter";

type ResetMode = "email" | "set";

interface ResetPasswordModalProps {
  isOpen: boolean;
  userId: string;
  userEmail: string;
  /** Shown as context; also drives the warning for privileged targets. */
  accountType?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Resets a password for any account — customers as well as admins.
 *
 * Two paths, because the right answer differs by who the account belongs to:
 *
 *  - **Email a reset link** (default): the user picks their own password and we
 *    never see it. Correct for a real customer; the only option that doesn't
 *    require an admin to handle someone else's credential.
 *  - **Set a password directly**: for accounts we operate ourselves (demo,
 *    test) or a user with no working inbox. The admin reads it out, so it is
 *    shown once and copyable.
 *
 * Both hit POST /api/admin/users/{id}/reset-password. Privilege checks
 * (superadmin-only for admin targets, no self-reset) are enforced in
 * avry-backend, not here.
 */
export function ResetPasswordModal({
  isOpen,
  userId,
  userEmail,
  accountType,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [mode, setMode] = useState<ResetMode>("email");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [clearUsageData, setClearUsageData] = useState(false);

  if (!isOpen) return null;

  const isPrivileged = accountType === "admin" || accountType === "superadmin";
  const isDemo = accountType === "demo";

  const reset = () => {
    setMode("email");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError("");
    setLoading(false);
    setResult(null);
    setCopied(false);
    setClearUsageData(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = () => {
    // Uses the Web Crypto RNG rather than Math.random — this value becomes a
    // real account credential the moment it is submitted.
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
    const bytes = new Uint32Array(20);
    crypto.getRandomValues(bytes);
    const next = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    setPassword(next);
    setConfirmPassword(next);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard — select and copy manually.");
    }
  };

  const validate = (): string | null => {
    if (mode === "email") return null;
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
        `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(mode === "email" ? { mode: "email" } : { mode: "set", password }),
            ...(isDemo && clearUsageData ? { clearUsageData: true } : {}),
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Failed to reset password");
      }

      const clearedSuffix =
        isDemo && clearUsageData ? " Its demo data (diagnostics, blueprint, roadmap, workflows) was cleared." : "";

      if (mode === "email") {
        // The backend reports delivery honestly here (there is nothing to
        // enumerate for an admin), so a bounced mail must not read as success.
        setResult(
          (data.emailSent
            ? `Reset link sent to ${userEmail}. It expires in 60 minutes.`
            : data.message ||
                "Reset link created, but the email could not be sent. Set a password directly instead.") +
            clearedSuffix
        );
      } else {
        setResult(
          `Password updated. ${userEmail} has been signed out of all sessions.` + clearedSuffix
        );
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1e1e20] p-6 shadow-2xl">
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="mb-1 text-xl font-semibold text-white">Reset Password</h2>
        <p className="mb-4 text-sm text-gray-400">
          {userEmail}
          {accountType ? (
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs capitalize text-gray-300">
              {accountType}
            </span>
          ) : null}
        </p>

        {result ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-[#b7cba6]/30 bg-[#b7cba6]/10 px-3 py-3 text-sm text-[#b7cba6]">
              {result}
            </p>
            <button
              onClick={handleClose}
              className="w-full rounded-md bg-[#b7cba6] px-4 py-2 font-medium text-[#14140f] transition-colors hover:bg-[#c8dab8]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  setError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  mode === "email"
                    ? "border-[#b7cba6]/50 bg-[#b7cba6]/15 text-[#b7cba6]"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                <Mail size={14} /> Email a link
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("set");
                  setError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  mode === "set"
                    ? "border-[#b7cba6]/50 bg-[#b7cba6]/15 text-[#b7cba6]"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                <KeyRound size={14} /> Set directly
              </button>
            </div>

            {mode === "email" ? (
              <p className="text-xs leading-relaxed text-gray-500">
                Sends {userEmail} a one-time link to choose their own password.
                Nothing changes until they use it, and you never see the
                password. This is the right option for a customer account.
              </p>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-gray-500">
                  Sets the password immediately and signs the account out
                  everywhere. Use this for accounts we operate ourselves, or when
                  the user has no working inbox — you will have to pass the
                  password on yourself.
                </p>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="reset-new-password"
                      className="text-sm font-medium text-gray-200"
                    >
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex items-center gap-1 text-sm text-[#b7cba6] transition-colors hover:text-[#c8dab8]"
                    >
                      <RefreshCw size={14} /> Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-[#2a2a27] px-3 py-2 pr-14 text-gray-100 placeholder-gray-500 focus:border-[#b7cba6]/50 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
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
                      {copied ? "Copied!" : "Copy password"}
                    </button>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="mb-1 block text-sm font-medium text-gray-200"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#2a2a27] px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-[#b7cba6]/50 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </>
            )}

            {isPrivileged && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                This is a privileged account. Only superadmins can reset it, and
                the change ends every session it currently holds.
              </p>
            )}

            {isDemo && (
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={clearUsageData}
                  onChange={(e) => setClearUsageData(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Also clear this account&rsquo;s demo data (diagnostics,
                  blueprint, roadmap, workflows) — use this when handing the
                  account to a different prospect.
                </span>
              </label>
            )}

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-md border border-white/15 px-4 py-2 text-gray-200 transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-[#b7cba6] px-4 py-2 font-medium text-[#14140f] transition-colors hover:bg-[#c8dab8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Working…"
                  : mode === "email"
                    ? "Send reset link"
                    : "Set password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordModal;
