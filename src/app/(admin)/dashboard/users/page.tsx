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
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
];

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
        "Credits Used": selectedUser.creditsUsed.toLocaleString(),
        "Credits Max": selectedUser.creditsMax.toLocaleString(),
        "Created At": new Date(selectedUser.createdAt).toLocaleString(),
        Payments: selectedUser.payments,
      }
    : {};

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />;

  const columns = getColumns((user) => setImpersonateTarget(user));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Users &amp; Credits</h1>
        <WriteGate>
          <div className="flex gap-2">
            <button
              onClick={() => alert("Edit Credits — coming soon")}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              Edit Credits
            </button>
            <button
              onClick={() => alert("Change Account Type — coming soon")}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              Change Account Type
            </button>
          </div>
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
            className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
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
          onClose={() => setSelectedUser(null)}
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
