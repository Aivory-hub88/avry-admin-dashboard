"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import WriteGate from "@/components/rbac/WriteGate";
import { ImpersonateButton } from "@/components/impersonation/ImpersonateButton";
import { ConsentModal } from "@/components/impersonation/ConsentModal";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";

interface Payment {
  paymentId: string;
  product: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface AdminUserView extends Record<string, unknown> {
  userId: string;
  email: string;
  accountType: string;
  tier: string;
  features?: string[];
  tierExpiresAt?: string | null;
  creditsBalance?: number | null;
  creditsUsed: number;
  creditsMax: number;
  createdAt: string;
  payments: Payment[];
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "free", label: "Free" },
  { value: "snapshot", label: "Snapshot" },
  { value: "blueprint", label: "Blueprint" },
  { value: "enterprise", label: "Enterprise" },
  { value: "demo", label: "Demo" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
];

/**
 * Types an account may be changed *to*. `all` is a filter value, not an account
 * type, so it is excluded.
 *
 * Granting or removing admin/superadmin is superadmin-only and enforced in
 * avry-backend — the UI is gated to match, but the server is the authority.
 */
const ASSIGNABLE_ACCOUNT_TYPES = ACCOUNT_TYPE_OPTIONS.filter((o) => o.value !== "all");

function getColumns(onImpersonate: (user: AdminUserView) => void): Column<AdminUserView>[] {
  return [
    { key: "email", header: "Email" },
    {
      key: "accountType",
      header: "Type",
      width: "100px",
      render: (row) => <span className="capitalize">{row.accountType}</span>,
    },
    { key: "tier", header: "Tier", width: "90px", render: (row) => <span className="capitalize">{row.tier}</span> },
    {
      key: "creditsUsed",
      header: "Credits",
      width: "90px",
      render: (row) => `${row.creditsUsed ?? 0}/${row.creditsMax ?? 0}`,
    },
    {
      key: "createdAt",
      header: "Created",
      width: "110px",
      render: (row) => {
        if (!row.createdAt) return "—";
        const d = new Date(row.createdAt);
        return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "130px",
      render: (row) => (
        <ImpersonateButton
          user={{ userId: row.userId, email: row.email, accountType: row.accountType }}
          onImpersonate={() => onImpersonate(row)}
        />
      ),
    },
  ];
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [emailSearch, setEmailSearch] = useState("");
  const [impersonateTarget, setImpersonateTarget] = useState<AdminUserView | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserView | null>(null);

  // Edit state for the user open in the detail panel.
  const [creditDelta, setCreditDelta] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editDone, setEditDone] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bffFetch("/api/admin/users");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load users (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const matchesType = accountTypeFilter === "all" || u.accountType === accountTypeFilter;
    const matchesEmail = emailSearch === "" || u.email.toLowerCase().includes(emailSearch.toLowerCase());
    return matchesType && matchesEmail;
  });

  const detailData = selectedUser
    ? {
        "User ID": selectedUser.userId,
        Email: selectedUser.email,
        "Account Type": selectedUser.accountType,
        Tier: selectedUser.tier,
        "Unlocked features": selectedUser.features?.length
          ? selectedUser.features.join(", ")
          : "—",
        "Tier expires": selectedUser.tierExpiresAt
          ? new Date(selectedUser.tierExpiresAt).toLocaleString()
          : "—",
        "Credit balance":
          selectedUser.creditsBalance === null || selectedUser.creditsBalance === undefined
            ? "no ledger row yet"
            : `${selectedUser.creditsBalance.toLocaleString()} / ${selectedUser.creditsMax.toLocaleString()} monthly`,
        "Credits Used": selectedUser.creditsUsed.toLocaleString(),
        "Created At": new Date(selectedUser.createdAt).toLocaleString(),
        Payments: selectedUser.payments,
      }
    : {};

  /** Close the panel and drop any half-typed edit with it. */
  const closeDetail = () => {
    setSelectedUser(null);
    setCreditDelta("");
    setCreditNote("");
    setNewAccountType("");
    setEditError(null);
    setEditDone(null);
    setEditBusy(false);
  };

  /**
   * Apply a relative credit change. Relative rather than absolute on purpose: an
   * admin correcting a balance is reacting to an event ("refund 200"), and a
   * concurrent consume between read and write would silently swallow an absolute
   * set. The service also supports `setBalance` for the rarer exact case.
   */
  const submitCreditChange = async () => {
    if (!selectedUser) return;
    const delta = Number(creditDelta);
    if (!creditDelta.trim() || !Number.isFinite(delta) || delta === 0) {
      setEditError("Enter a non-zero number of credits (negative to remove).");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    setEditDone(null);
    try {
      const res = await bffFetch(
        `/api/admin/users/${encodeURIComponent(selectedUser.userId)}/credits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta, note: creditNote || undefined }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Could not adjust credits");

      const applied = data?.applied_delta ?? delta;
      setEditDone(
        applied === delta
          ? `Balance is now ${data?.balance ?? "—"}.`
          : `Clamped at zero: applied ${applied}, balance is now ${data?.balance ?? "—"}.`
      );
      setCreditDelta("");
      setCreditNote("");
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not adjust credits");
    } finally {
      setEditBusy(false);
    }
  };

  const submitAccountTypeChange = async () => {
    if (!selectedUser || !newAccountType) return;
    if (newAccountType === selectedUser.accountType) {
      setEditError("That is already this user's account type.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    setEditDone(null);
    try {
      const res = await bffFetch(
        `/api/admin/users/${encodeURIComponent(selectedUser.userId)}/account-type`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountType: newAccountType }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Could not change account type");

      setEditDone(
        `Account type is now ${newAccountType}. It applies on the user's next sign-in — ` +
          `their current session keeps the old access until its token expires.`
      );
      setSelectedUser({ ...selectedUser, accountType: newAccountType });
      setNewAccountType("");
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not change account type");
    } finally {
      setEditBusy(false);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />;

  const columns = getColumns((user) => setImpersonateTarget(user));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Users &amp; Credits</h1>
        {/* Editing is per-user, so it lives in the row's detail panel rather than
            in a header button with nothing selected. */}
        <WriteGate>
          <p className="text-xs text-gray-500">
            Select a user to edit credits, account type or password
          </p>
        </WriteGate>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        onRowClick={(row) => setSelectedUser(row)}
        searchPlaceholder="Search by email..."
        onSearch={setEmailSearch}
        filterSlot={
          <select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
          >
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
        emptyMessage="No users found."
      />

      {selectedUser && (
        <DetailView
          title={`User: ${selectedUser.email}`}
          recordType="user"
          recordId={selectedUser.userId}
          data={detailData as Record<string, unknown>}
          onClose={closeDetail}
          actions={
            <WriteGate>
              <div className="space-y-4 rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Adjust credits</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Relative change, written to the credit ledger against your
                    account. Negative removes; it stops at zero rather than going
                    negative.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={creditDelta}
                      onChange={(e) => {
                        setCreditDelta(e.target.value);
                        setEditError(null);
                      }}
                      placeholder="e.g. 200 or -50"
                      className="w-32 rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
                    />
                    <input
                      type="text"
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      placeholder="Reason (recorded in the ledger)"
                      className="flex-1 rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
                    />
                    <button
                      onClick={submitCreditChange}
                      disabled={editBusy}
                      className="rounded-lg bg-[#b7cba6]/20 px-4 py-2 text-sm font-medium text-[#b7cba6] transition-colors hover:bg-[#b7cba6]/30 disabled:opacity-50"
                    >
                      {editBusy ? "…" : "Apply"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/[0.07] pt-4">
                  <h3 className="text-sm font-semibold text-white">Change account type</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    This is the claim every module gates on. It takes effect at the
                    user&apos;s next sign-in, and admin/superadmin changes are
                    refused for non-superadmin callers.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={newAccountType}
                      onChange={(e) => {
                        setNewAccountType(e.target.value);
                        setEditError(null);
                      }}
                      className="flex-1 rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
                    >
                      <option value="">
                        Currently {selectedUser.accountType} — choose new type…
                      </option>
                      {ASSIGNABLE_ACCOUNT_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={submitAccountTypeChange}
                      disabled={editBusy || !newAccountType}
                      className="rounded-lg border border-white/[0.07] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/[0.07] pt-4">
                  <h3 className="text-sm font-semibold text-white">Reset password</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Email the user a one-time link so they choose their own
                    password, or set one directly for accounts we operate. Either
                    way the account is signed out everywhere once the password
                    changes.
                  </p>
                  <button
                    onClick={() => setResetTarget(selectedUser)}
                    className="mt-2 rounded-lg border border-white/[0.07] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
                  >
                    Reset password…
                  </button>
                </div>

                {editError && <p className="text-xs text-red-300">{editError}</p>}
                {editDone && <p className="text-xs text-[#b7cba6]">{editDone}</p>}
              </div>
            </WriteGate>
          }
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          isOpen={!!resetTarget}
          userId={resetTarget.userId}
          userEmail={resetTarget.email}
          accountType={resetTarget.accountType}
          onClose={() => setResetTarget(null)}
        />
      )}

      {impersonateTarget && (
        <ConsentModal
          isOpen={!!impersonateTarget}
          targetUser={{
            userId: impersonateTarget.userId,
            email: impersonateTarget.email,
          }}
          onClose={() => setImpersonateTarget(null)}
          onSuccess={(session) => {
            // Open user dashboard in new tab after impersonation starts
            const userDashboardUrl = `http://${window.location.hostname}/dashboard`;
            window.open(userDashboardUrl, "_blank");
            setImpersonateTarget(null);
          }}
        />
      )}
    </div>
  );
}
