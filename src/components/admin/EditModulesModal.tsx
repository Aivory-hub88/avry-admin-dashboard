"use client";
import { bffFetch } from "@/lib/bff";

import React, { useState } from "react";
import { X } from "lucide-react";
import { ALL_MODULES, HOME_MODULE_KEY } from "@/lib/demoModules";

interface EditModulesModalProps {
  isOpen: boolean;
  userId: string;
  userEmail: string;
  initialModules: string[];
  onClose: () => void;
  onSuccess: (allowedModules: string[]) => void;
}

/**
 * Edits which dashboard modules an existing demo account can access.
 * Sends the new selection to PATCH /api/admin/admin-accounts/{id}/modules.
 */
export function EditModulesModal({
  isOpen,
  userId,
  userEmail,
  initialModules,
  onClose,
  onSuccess,
}: EditModulesModalProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>(
    initialModules.length > 0 ? initialModules : [HOME_MODULE_KEY]
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleModule = (key: string) => {
    if (key === HOME_MODULE_KEY) return; // always included, not toggleable
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await bffFetch(
        `/api/admin/admin-accounts/${userId}/modules`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allowedModules: selectedModules }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || "Failed to update modules");
      }
      setSuccess(true);
      const updated: string[] = data.allowedModules ?? selectedModules;
      setTimeout(() => {
        handleClose();
        onSuccess(updated);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update modules");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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

        <h2 className="text-xl font-semibold text-white mb-1">Edit Module Access</h2>
        <p className="text-sm text-gray-400 mb-4">{userEmail}</p>

        {success ? (
          <div className="text-center py-8 text-[#b7cba6] font-medium">
            ✓ Module access updated!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map((m) => {
                const isHome = m.key === HOME_MODULE_KEY;
                const checked = selectedModules.includes(m.key);
                return (
                  <label
                    key={m.key}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isHome
                        ? "border-white/5 bg-white/5 text-gray-400 cursor-not-allowed"
                        : "border-white/10 bg-[#2a2a27] text-gray-200 cursor-pointer hover:border-[#b7cba6]/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isHome}
                      onChange={() => toggleModule(m.key)}
                      className="accent-[#b7cba6]"
                    />
                    <span>{m.label}</span>
                    {isHome && (
                      <span className="text-[10px] text-gray-500">(home)</span>
                    )}
                  </label>
                );
              })}
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
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
