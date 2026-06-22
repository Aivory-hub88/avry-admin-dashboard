"use client";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import WriteGate from "@/components/rbac/WriteGate";

export default function SettingsPage() {
  const { user, role, logout } = useAuth();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "(not set)";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      {/* Account Info */}
      <section className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Account</h2>

        <div className="grid grid-cols-3 gap-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 pt-0.5">Email</dt>
          <dd className="col-span-2 text-sm text-gray-200">{user?.email ?? "—"}</dd>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 pt-0.5">Account Type</dt>
          <dd className="col-span-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                role === "superadmin"
                  ? "bg-[#00e59e]/20 text-[#00e59e]"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              {role ?? "—"}
            </span>
          </dd>
        </div>
      </section>

      {/* Configuration */}
      <section className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Configuration</h2>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">API URL</span>
            <div className="mt-1.5">
              <WriteGate
                fallback={
                  <div className="rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-400 select-all">
                    {apiUrl}
                  </div>
                }
              >
                <input
                  type="text"
                  defaultValue={apiUrl}
                  readOnly
                  className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
                />
              </WriteGate>
            </div>
          </label>
        </div>

        <WriteGate>
          <div className="pt-2">
            <button
              onClick={() => alert("Save configuration — coming soon")}
              className="rounded-lg bg-[#00e59e]/15 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </WriteGate>
      </section>

      {/* Session */}
      <section className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Session</h2>
        <p className="text-sm text-gray-400">
          Logging out will clear your session and redirect you to the login page.
        </p>
        <button
          onClick={logout}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Logout
        </button>
      </section>
    </div>
  );
}
