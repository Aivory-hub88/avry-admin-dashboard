"use client";

import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

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
  const [banDuration, setBanDuration] = useState<string>("24h");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/${adminId}/deactivate`, {
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
      const response = await fetch(`/api/admin/${adminId}/deactivate`, {
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
    setBanDuration("24h");
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

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 mb-2">✓ Admin updated successfully!</div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertTriangle className="text-orange-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold">
                {banDuration === "reactivate"
                  ? "Reactivate Admin"
                  : "Deactivate Admin"}
              </h2>
            </div>

            <p className="text-gray-600 mb-4">
              {banDuration === "reactivate"
                ? `Are you sure you want to reactivate ${adminEmail}?`
                : `Are you sure you want to deactivate ${adminEmail}?`}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {banDuration !== "reactivate" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="banDuration"
                          value={option.value}
                          checked={banDuration === option.value}
                          onChange={(e) => setBanDuration(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                {banDuration === "reactivate" ? (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    {loading ? "Updating..." : "Reactivate"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
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