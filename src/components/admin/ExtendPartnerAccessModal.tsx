"use client";
import { bffFetch } from "@/lib/bff";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  DEFAULT_PARTNER_FREE_MONTHS,
  PARTNER_FREE_MONTH_OPTIONS,
  type PartnerFreeMonths,
  describePartnerAccess,
  formatFreeMonths,
} from "@/lib/partnerAccess";

interface ExtendPartnerAccessModalProps {
  isOpen: boolean;
  userId: string;
  userEmail: string;
  expiresAt: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Adds free months to a distributor partner's Enterprise access via
 * PATCH /api/admin/admin-accounts/{id}/partner-access. The backend extends
 * from the later of the current expiry or today.
 */
export function ExtendPartnerAccessModal({
  isOpen,
  userId,
  userEmail,
  expiresAt,
  onClose,
  onSuccess,
}: ExtendPartnerAccessModalProps) {
  const [months, setMonths] = useState<PartnerFreeMonths>(DEFAULT_PARTNER_FREE_MONTHS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newExpiry, setNewExpiry] = useState<string | null>(null);

  if (!isOpen) return null;

  const current = describePartnerAccess(expiresAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await bffFetch(`/api/admin/admin-accounts/${userId}/partner-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeMonths: months }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || "Failed to extend partner access");
      }
      setNewExpiry(data.partnerExpiresAt ?? null);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend partner access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1e1e20] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-1">Extend Free Access</h2>
        <p className="text-sm text-gray-400 mb-4">{userEmail}</p>

        {newExpiry !== null ? (
          <div className="text-center py-8 text-[#b7cba6] font-medium">
            ✓ {describePartnerAccess(newExpiry)?.label ?? "Access extended"}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-300">
              {current
                ? current.expired
                  ? `Free access ${current.label.toLowerCase()}. The new period starts today.`
                  : `${current.label}. The months are added on top.`
                : "The months are added from today."}
            </p>
            <FreeMonthsPicker value={months} onChange={setMonths} />

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-white/15 text-gray-200 rounded-md hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#b7cba6] text-[#14140f] font-medium rounded-md hover:bg-[#c8dab8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Extending..." : `Add ${formatFreeMonths(months)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function FreeMonthsPicker({
  value,
  onChange,
}: {
  value: PartnerFreeMonths;
  onChange: (months: PartnerFreeMonths) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-1">Free Duration</label>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Free duration">
        {PARTNER_FREE_MONTH_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            onClick={() => onChange(m)}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              value === m
                ? "border-[#b7cba6] bg-[#b7cba6]/15 text-[#b7cba6]"
                : "border-white/10 bg-[#2a2a27] text-gray-200 hover:border-[#b7cba6]/40"
            }`}
          >
            {formatFreeMonths(m)}
          </button>
        ))}
      </div>
    </div>
  );
}
