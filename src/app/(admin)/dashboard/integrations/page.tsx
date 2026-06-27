"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface IntegrationConnection extends Record<string, unknown> {
  integrationId: string;
  integrationName: string;
  userId: string;
  provider: string;
  status: "connected" | "error" | "expired";
  lastSyncedAt: string;
  details?: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  connected: "bg-[#b7cba6]/20 text-[#b7cba6]",
  error: "bg-red-500/20 text-red-400",
  expired: "bg-yellow-500/20 text-yellow-400",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "connected", label: "Connected" },
  { value: "error", label: "Error" },
  { value: "expired", label: "Expired" },
];

const columns: Column<IntegrationConnection>[] = [
  { key: "integrationName", header: "Integration Name" },
  { key: "userId", header: "User ID", width: "140px" },
  {
    key: "provider",
    header: "Provider",
    width: "120px",
    render: (row) => <span className="capitalize">{row.provider}</span>,
  },
  {
    key: "status",
    header: "Status",
    width: "110px",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[row.status] ?? ""}`}>
        {row.status}
      </span>
    ),
  },
  {
    key: "lastSyncedAt",
    header: "Last Synced At",
    width: "160px",
    render: (row) =>
      new Date(row.lastSyncedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConnection | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bffFetch("/api/admin/integrations");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load integrations (${res.status})`);
      }
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = integrations.filter((i) =>
    statusFilter === "all" || i.status === statusFilter
  );

  const detailData = selectedIntegration
    ? {
        "Integration ID": selectedIntegration.integrationId,
        "Integration Name": selectedIntegration.integrationName,
        "User ID": selectedIntegration.userId,
        Provider: selectedIntegration.provider,
        Status: selectedIntegration.status,
        "Last Synced At": new Date(selectedIntegration.lastSyncedAt).toLocaleString(),
        Details: selectedIntegration.details ?? null,
      }
    : {};

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchIntegrations} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Integrations</h1>

      <DataTable
        columns={columns}
        data={filteredIntegrations}
        onRowClick={(row) => setSelectedIntegration(row)}
        filterSlot={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
        emptyMessage="No integrations found."
      />

      {selectedIntegration && (
        <DetailView
          title={`Integration: ${selectedIntegration.integrationName}`}
          recordType="integration"
          recordId={selectedIntegration.integrationId}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  );
}
