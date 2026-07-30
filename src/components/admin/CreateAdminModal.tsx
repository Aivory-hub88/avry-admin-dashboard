"use client";
import { bffFetch } from "@/lib/bff";

import React, { useState } from "react";
import { X, Copy, RefreshCw } from "lucide-react";
import { PasswordStrengthMeter } from "../ui/password-strength-meter/PasswordStrengthMeter";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /**
   * Which kind of account to create. "admin" (default) creates a dashboard
   * admin; "demo" creates a limited product user that can only access the
   * Diagnostic, Blueprint, Roadmap and AI Console modules.
   */
  accountType?: "admin" | "demo";
}

/** Modules a demo account is allowed to use — shown for context in the modal. */
const DEMO_MODULES = ["Diagnostic", "Blueprint", "Roadmap", "AI Console"];

export function CreateAdminModal({
  isOpen,
  onClose,
  onSuccess,
  accountType = "admin",
}: CreateAdminModalProps) {
  const isDemo = accountType === "demo";
  const entityLabel = isDemo ? "Demo User" : "Admin";
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let newPass = "";
    for (let i = 0; i < 16; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(newPass);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  const validateForm = (): string | null => {
    if (!email || !fullName) {
      return "Email and full name are required";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Invalid email format";
    }

    if (autoGeneratePassword) {
      if (!generatedPassword) {
        return "Please generate a password";
      }
    } else {
      if (!password) {
        return "Password is required";
      }

      if (password.length < 8) {
        return "Password must be at least 8 characters long";
      }

      if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter";
      }

      if (!/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase letter";
      }

      if (!/[0-9]/.test(password)) {
        return "Password must contain at least one number";
      }

      if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        return "Password must contain at least one special character";
      }

      if (password !== confirmPassword) {
        return "Passwords do not match";
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const response = await bffFetch("/api/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: autoGeneratePassword ? generatedPassword : password,
          fullName,
          accountType,
          autoGeneratePassword: false, // We send the generated password manually
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create ${entityLabel.toLowerCase()}`);
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setAutoGeneratePassword(false);
    setGeneratedPassword("");
    setError("");
    setSuccess(false);
    setLoading(false);
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

        <h2 className="text-xl font-semibold text-white mb-4">
          {isDemo ? "Create Demo User" : "Create New Admin"}
        </h2>

        {success ? (
          <div className="text-center py-8">
            <div className="text-[#b7cba6] font-medium mb-2">
              ✓ {entityLabel} created successfully!
            </div>
            {autoGeneratePassword && (
              <div className="text-sm text-gray-400">
                Please share the password with the {entityLabel.toLowerCase()}.
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isDemo && (
              <div className="rounded-md bg-[#b7cba6]/10 border border-[#b7cba6]/30 px-3 py-2 text-xs text-[#b7cba6]">
                Demo users can only access{" "}
                <span className="font-semibold text-white">{DEMO_MODULES.join(", ")}</span>.
                All other modules are locked. The password can be changed later.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50 focus:border-[#b7cba6]/50"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50 focus:border-[#b7cba6]/50"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-200">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAutoGeneratePassword(!autoGeneratePassword)}
                  className="text-sm text-[#b7cba6] hover:text-[#c8dab8] transition-colors"
                >
                  {autoGeneratePassword
                    ? "Switch to Manual Password"
                    : "Auto-generate Password"}
                </button>
              </div>

              {autoGeneratePassword ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md font-mono text-sm text-gray-100">
                      {generatedPassword || "Click Generate"}
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="px-3 py-2 bg-[#b7cba6] text-[#14140f] rounded-md hover:bg-[#c8dab8] transition-colors"
                      title="Generate new password"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  {generatedPassword && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
                    >
                      <Copy size={16} />
                      {copySuccess ? "Copied!" : "Copy password"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50 focus:border-[#b7cba6]/50 pr-14"
                      placeholder="Enter password"
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

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2a2a27] border border-white/10 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/50 focus:border-[#b7cba6]/50 pr-14"
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

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
                {loading ? "Creating..." : `Create ${entityLabel}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}