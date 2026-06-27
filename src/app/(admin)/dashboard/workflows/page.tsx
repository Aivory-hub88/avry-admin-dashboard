"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface WorkflowRun extends Record<string, unknown> {
  workflowId: string;
  workflowName: string;
  userId: string;
  status: "active" | "inactive" | "error";
  triggeredAt: string;
  durationMs: number;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-[#b7cba6]/20 text-[#b7cba6]",
  inactive: "bg-white/10 text-gray-400",
  error: "bg-red-500/20 text-red-400",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "error", label: "Error" },
];

const columns: Column<WorkflowRun>[] = [
  { key: "workflowId", header: "Workflow ID", width: "140px" },
  { key: "workflowName", header: "Workflow Name" },
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
    key: "triggeredAt",
    header: "Triggered At",
    width: "160px",
    render: (row) => new Date(row.triggeredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  },
  {
    key: "durationMs",
    header: "Duration (ms)",
    width: "120px",
    render: (row) => row.durationMs.toLocaleString(),
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

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRun | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bffFetch("/api/admin/workflows");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load workflows (${res.status})`);
      }
      const data = await res.json();
      setWorkflows(data.workflows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter((w) =>
    statusFilter === "all" || w.status === statusFilter
  );

  const detailData = selectedWorkflow
    ? {
        "Workflow ID": selectedWorkflow.workflowId,
        "Workflow Name": selectedWorkflow.workflowName,
        "User ID": selectedWorkflow.userId,
        Status: selectedWorkflow.status,
        "Triggered At": new Date(selectedWorkflow.triggeredAt).toLocaleString(),
        "Duration (ms)": selectedWorkflow.durationMs.toLocaleString(),
        Error: selectedWorkflow.error ?? null,
      }
    : {};

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchWorkflows} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Workflow Runs</h1>

      <DataTable
        columns={columns}
        data={filteredWorkflows}
        onRowClick={(row) => setSelectedWorkflow(row)}
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
        emptyMessage="No workflow runs found."
      />

      {selectedWorkflow && (
        <DetailView
          title={`Workflow: ${selectedWorkflow.workflowName}`}
          recordType="workflow"
          recordId={selectedWorkflow.workflowId}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelectedWorkflow(null)}
        />
      )}
    </div>
  );
}
