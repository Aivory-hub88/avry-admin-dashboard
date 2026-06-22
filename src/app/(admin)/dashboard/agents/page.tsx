"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface AgentExecution extends Record<string, unknown> {
  agentId: string;
  agentName: string;
  userId: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  durationMs: number;
  error?: string;
  payload?: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-500/20 text-blue-400",
  success: "bg-[#00e59e]/20 text-[#00e59e]",
  failed: "bg-red-500/20 text-red-400",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const columns: Column<AgentExecution>[] = [
  { key: "agentId", header: "Agent ID", width: "140px" },
  { key: "agentName", header: "Agent Name" },
  { key: "userId", header: "User ID", width: "140px" },
  {
    key: "status",
    header: "Status",
    width: "100px",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[row.status] ?? ""}`}>
        {row.status}
      </span>
    ),
  },
  {
    key: "startedAt",
    header: "Started At",
    width: "160px",
    render: (row) => new Date(row.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  },
  {
    key: "durationMs",
    header: "Duration (ms)",
    width: "120px",
    render: (row) => row.durationMs > 0 ? row.durationMs.toLocaleString() : "—",
  },
  {
    key: "error",
    header: "Error",
    render: (row) =>
      row.error ? (
        <span className="text-red-400 text-xs truncate max-w-[200px] block" title={row.error}>
          {row.error}
        </span>
      ) : (
        <span className="text-gray-600">—</span>
      ),
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentExecution | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bffFetch("/api/admin/agents");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load agents (${res.status})`);
      }
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = agents.filter((a) =>
    statusFilter === "all" || a.status === statusFilter
  );

  const detailData = selectedAgent
    ? {
        "Agent ID": selectedAgent.agentId,
        "Agent Name": selectedAgent.agentName,
        "User ID": selectedAgent.userId,
        Status: selectedAgent.status,
        "Started At": new Date(selectedAgent.startedAt).toLocaleString(),
        "Duration (ms)": selectedAgent.durationMs > 0 ? selectedAgent.durationMs.toLocaleString() : "Still running",
        Error: selectedAgent.error ?? null,
        Payload: selectedAgent.payload ?? null,
      }
    : {};

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchAgents} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Agent Activity</h1>

      <DataTable
        columns={columns}
        data={filteredAgents}
        onRowClick={(row) => setSelectedAgent(row)}
        filterSlot={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
        emptyMessage="No agent executions found."
      />

      {selectedAgent && (
        <DetailView
          title={`Agent: ${selectedAgent.agentName}`}
          recordType="agent"
          recordId={selectedAgent.agentId}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
