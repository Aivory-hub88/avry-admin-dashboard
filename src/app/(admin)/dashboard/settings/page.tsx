"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import WriteGate from "@/components/rbac/WriteGate";
import { EyeIcon, EyeCloseIcon } from "@/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminAccount {
  id: string;
  email: string;
  fullName: string;
  status: "active" | "suspended";
  createdAt: string;
  lastLogin: string | null;
  forcePasswordChange: boolean;
}

// ─── Role badge helper ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: "superadmin" | "admin" | null }) {
  if (!role) return <span className="text-gray-500 text-sm">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        role === "superadmin"
          ? "bg-[#00e59e]/20 text-[#00e59e]"
          : "bg-white/10 text-gray-300"
      }`}
    >
      {role === "superadmin" ? "Superadmin" : "Admin"}
    </span>
  );
}

// ─── Create Admin Modal ────────────────────────────────────────────────────────

interface CreateAdminModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAdminModal({ onClose, onSuccess }: CreateAdminModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forceReset, setForceReset] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !fullName || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await bffFetch("/api/admin/admin-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          password,
          force_password_change: forceReset,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create admin account.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[#2a2a27] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-base font-semibold text-white">Create Admin Account</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aivory.id"
                required
                className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Temporary Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 pr-10 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeCloseIcon className="fill-gray-400" />
                  ) : (
                    <EyeIcon className="fill-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 pr-10 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showConfirm ? (
                    <EyeCloseIcon className="fill-gray-400" />
                  ) : (
                    <EyeIcon className="fill-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="forceReset"
                checked={forceReset}
                onChange={(e) => setForceReset(e.target.checked)}
                className="h-4 w-4 rounded border-white/[0.07] bg-white/5 accent-[#00e59e]"
              />
              <label htmlFor="forceReset" className="text-sm text-gray-300 cursor-pointer">
                Force password change on first login
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#00e59e]/15 border border-[#00e59e]/30 px-4 py-2.5 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating..." : "Create Admin Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Admin Accounts Table ──────────────────────────────────────────────────────

interface AdminAccountsTableProps {
  currentUserEmail: string;
}

function AdminAccountsTable({ currentUserEmail }: AdminAccountsTableProps) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bffFetch("/api/admin/admin-accounts");
      if (!res.ok) throw new Error(`Failed to load admin accounts (${res.status})`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin accounts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAction = async (id: string, action: "suspend" | "reactivate") => {
    setActionLoading(id);
    try {
      const res = await bffFetch(`/api/admin/admin-accounts/${id}/${action}`, {
        method: "PATCH",
      });
      if (res.ok) {
        await fetchAccounts();
        setSuccessMsg(
          action === "suspend" ? "Account suspended." : "Account reactivated."
        );
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Manage admin accounts that have access to this dashboard.
        </p>
        <WriteGate>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-[#00e59e]/15 border border-[#00e59e]/30 px-3 py-1.5 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors whitespace-nowrap"
          >
            + Create Admin
          </button>
        </WriteGate>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-[#00e59e]/10 border border-[#00e59e]/20 px-4 py-2.5 text-sm text-[#00e59e]">
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-500">No admin accounts found.</p>
      ) : (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Full Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, idx) => (
                <tr
                  key={account.id}
                  className={idx < accounts.length - 1 ? "border-b border-white/[0.04]" : ""}
                >
                  <td className="px-4 py-3 text-gray-200">{account.fullName}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{account.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        account.status === "active"
                          ? "bg-[#00e59e]/15 text-[#00e59e]"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {account.status === "active" ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(account.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <WriteGate>
                      {account.email === currentUserEmail ? (
                        <span className="text-xs text-gray-600">—</span>
                      ) : account.status === "active" ? (
                        <button
                          onClick={() => handleAction(account.id, "suspend")}
                          disabled={actionLoading === account.id}
                          className="rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                        >
                          {actionLoading === account.id ? "..." : "Suspend"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(account.id, "reactivate")}
                          disabled={actionLoading === account.id}
                          className="rounded border border-[#00e59e]/30 bg-[#00e59e]/10 px-2.5 py-1 text-xs font-medium text-[#00e59e] hover:bg-[#00e59e]/20 disabled:opacity-40 transition-colors"
                        >
                          {actionLoading === account.id ? "..." : "Reactivate"}
                        </button>
                      )}
                    </WriteGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchAccounts();
            setSuccessMsg("Admin account created successfully.");
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, role, logout } = useAuth();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "(not set)";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      {/* ── Account ── */}
      <section className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Account</h2>

        {/* Full Name */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 pt-0.5">Full Name</dt>
          <dd className="col-span-2 text-sm text-gray-200">
            {user?.fullName ?? <span className="text-gray-500">—</span>}
          </dd>
        </div>

        {/* Email */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 pt-0.5">Email</dt>
          <dd className="col-span-2 text-sm text-gray-200">{user?.email ?? "—"}</dd>
        </div>

        {/* Account Type */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 pt-0.5">Account Type</dt>
          <dd className="col-span-2">
            <RoleBadge role={role} />
          </dd>
        </div>
      </section>

      {/* ── Admin Accounts (superadmin only) ── */}
      {role === "superadmin" && (
        <section className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Admin Accounts</h2>
          <AdminAccountsTable currentUserEmail={user?.email ?? ""} />
        </section>
      )}

      {/* ── Configuration ── */}
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

      {/* ── Session ── */}
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
