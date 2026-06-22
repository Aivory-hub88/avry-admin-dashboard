"use client";

import React from "react";
import { UserCheck } from "lucide-react";

export interface ImpersonateButtonUser {
  userId: string;
  email: string;
  accountType: string;
}

interface ImpersonateButtonProps {
  user: ImpersonateButtonUser;
  onImpersonate: (user: ImpersonateButtonUser) => void;
}

/**
 * ImpersonateButton — Renders an "Impersonate" action button in the admin Users table.
 * Disabled for users with superadmin account_type.
 * On click, triggers the Consent Modal via the onImpersonate callback.
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5
 */
export function ImpersonateButton({ user, onImpersonate }: ImpersonateButtonProps) {
  const isSuperadmin = user.accountType === "superadmin";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!isSuperadmin) {
          onImpersonate(user);
        }
      }}
      disabled={isSuperadmin}
      title={
        isSuperadmin
          ? "Cannot impersonate superadmin accounts"
          : `Impersonate ${user.email}`
      }
      aria-label={
        isSuperadmin
          ? "Cannot impersonate superadmin accounts"
          : `Impersonate ${user.email}`
      }
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        isSuperadmin
          ? "cursor-not-allowed border-white/[0.04] text-gray-600 opacity-50"
          : "border-white/[0.07] text-gray-300 hover:bg-[#00e59e]/10 hover:text-[#00e59e] hover:border-[#00e59e]/30"
      }`}
    >
      <UserCheck size={14} />
      Impersonate
    </button>
  );
}
