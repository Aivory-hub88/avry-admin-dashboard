"use client";

import React, { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { bffFetch } from "@/lib/bff";

interface DeactivateModalProps {
  isOpen: boolean;
  adminId: string;
  adminEmail: string;
  isReactivation?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeactivateModal({
  isOpen,
  adminId,
  adminEmail,
  isReactivation = false,
  onClose,
  onSuccess,
}: DeactivateModalProps) {
  // `isReactivation` was previously declared and never read: the reactivate
  // branch keys off banDuration, which started at "24h" and had no radio option
  // for "reactivate", so that path was unreachable and clicking Reactivate
  // showed the deactivate dialog instead.
  const [banDuration, setBanDuration] = useState<string>(
    isReactivation ? "reactivate" : "24h"
  );

  // The parent can keep this modal mounted between the two flows, so state must
  // follow a mode change rather than only the initial mount.
  useEffect(() => {
    setBanDuration(isReactivation ? "reactivate" : "24h");
  }, [isReactivation]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await bffFetch(`/api/admin/${adminId}/deactivate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ banDuration }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update admin status");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin status");
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await bffFetch(`/api/admin/${adminId}/deactivate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ banDuration: "reactivate" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate admin");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reactivate admin");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSuccess(false);
    setLoading(false);
    setBanDuration(isReactivation ? "reactivate" : "24h");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1e1e20] p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-white"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="mb-2 font-medium text-[#b7cba6]">✓ Admin updated successfully!</div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-amber-500/15 p-2">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {banDuration === "reactivate"
                  ? "Reactivate Admin"
                  : "Deactivate Admin"}
              </h2>
            </div>

            <p className="mb-4 text-sm text-gray-400">
              {banDuration === "reactivate"
                ? `Are you sure you want to reactivate ${adminEmail}?`
                : `Are you sure you want to deactivate ${adminEmail}?`}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {banDuration !== "reactivate" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-200">
                    Deactivation Duration
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "24h", label: "24 Hours" },
                      { value: "7d", label: "7 Days" },
                      { value: "30d", label: "30 Days" },
                      { value: "indefinitely", label: "Indefinitely" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-[#2a2a27] p-2 text-gray-200 transition-colors hover:bg-white/5"
                      >
                        <input
                          type="radio"
                          name="banDuration"
                          value={option.value}
                          checked={banDuration === option.value}
                          onChange={(e) => setBanDuration(e.target.value)}
                          className="accent-[#b7cba6] focus:ring-[#b7cba6]/50"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-md border border-white/15 px-4 py-2 text-gray-200 transition-colors hover:bg-white/5"
                >
                  Cancel
                </button>
                {banDuration === "reactivate" ? (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={loading}
                    className="flex-1 rounded-md bg-[#b7cba6] px-4 py-2 font-medium text-[#14140f] transition-colors hover:bg-[#c8dab8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "Reactivate"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Deactivating..." : "Deactivate"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}