"use client";

import React, { useState } from "react";
import { X, Copy, RefreshCw } from "lucide-react";
import { PasswordStrengthMeter } from "../ui/password-strength-meter/PasswordStrengthMeter";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAdminModal({ isOpen, onClose, onSuccess }: CreateAdminModalProps) {
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
      const response = await fetch("/admin/api/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: autoGeneratePassword ? generatedPassword : password,
          fullName,
          autoGeneratePassword: false, // We send the generated password manually
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
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
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4">Create New Admin</h2>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 mb-2">
              ✓ Admin created successfully!
            </div>
            {autoGeneratePassword && (
              <div className="text-sm text-gray-600">
                Please share the password with the admin.
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAutoGeneratePassword(!autoGeneratePassword)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {autoGeneratePassword
                    ? "Switch to Manual Password"
                    : "Auto-generate Password"}
                </button>
              </div>

              {autoGeneratePassword ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm">
                      {generatedPassword || "Click Generate"}
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      title="Generate new password"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  {generatedPassword && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}