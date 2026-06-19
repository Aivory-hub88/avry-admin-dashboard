"use client";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface BlueprintRecord extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  title: string;
  status: "draft" | "generating" | "completed" | "failed";
  sections: number;
  completedSections: number;
  generatedAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-[#00e59e]/20 text-[#00e59e]",
  generating: "bg-yellow-500/20 text-yellow-400",
  draft: "bg-white/10 text-gray-300",
  failed: "bg-red-500/20 text-red-400",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "generating", label: "Generating" },
  { value: "draft", label: "Draft" },
  { value: "failed", label: "Failed" },
];

const columns: Column<BlueprintRecord>[] = [
  { key: "title", header: "Title" },
  { key: "userEmail", header: "User" },
  {
    key: "status",
    header: "Status",
    width: "120px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[row.status] ?? ""}`}
      >
        {row.status}
      </span>
    ),
  },
  {
    key: "sections",
    header: "Progress",
    width: "110px",
    render: (row) => (
      <span className="text-gray-300 text-sm">
        {row.completedSections}/{row.sections} sections
      </span>
    ),
  },
  {
    key: "pdfUrl",
    header: "PDF",
    width: "80px",
    render: (row) =>
      row.pdfUrl ? (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#00e59e]/10 text-[#00e59e]">
          Ready
        </span>
      ) : (
        <span className="text-gray-600 text-xs">—</span>
      ),
  },
  {
    key: "createdAt",
    header: "Created At",
    width: "160px",
    render: (row) =>
      new Date(row.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
];

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<BlueprintRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BlueprintRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [emailSearch, setEmailSearch] = useState("");

  const fetchBlueprints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/api/admin/blueprints");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load blueprints (${res.status})`);
      }
      const data = await res.json();
      setBlueprints(data.blueprints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blueprints");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const filtered = blueprints.filter((b) => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesEmail =
      emailSearch === "" ||
      b.userEmail.toLowerCase().includes(emailSearch.toLowerCase()) ||
      b.title.toLowerCase().includes(emailSearch.toLowerCase());
    return matchesStatus && matchesEmail;
  });

  const detailData = selected
    ? {
        ID: selected.id,
        "User ID": selected.userId,
        Email: selected.userEmail,
        Tier: selected.tier,
        Title: selected.title,
        Status: selected.status,
        Sections: `${selected.completedSections} / ${selected.sections}`,
        "PDF Available": selected.pdfUrl ? "Yes" : "No",
        "Created At": new Date(selected.createdAt).toLocaleString(),
        "Generated At": selected.generatedAt
          ? new Date(selected.generatedAt).toLocaleString()
          : "—",
      }
    : {};

  // KPI summary
  const total = blueprints.length;
  const completed = blueprints.filter((b) => b.status === "completed").length;
  const generating = blueprints.filter((b) => b.status === "generating").length;
  const failed = blueprints.filter((b) => b.status === "failed").length;

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchBlueprints} />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Blueprint Monitoring</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Blueprints", value: total, color: "text-white" },
          { label: "Completed", value: completed, color: "text-[#00e59e]" },
          { label: "Generating", value: generating, color: "text-yellow-400" },
          { label: "Failed", value: failed, color: "text-red-400" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">
              {kpi.label}
            </p>
            <p className={`text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
        pageSize={20}
        searchPlaceholder="Search by email or title..."
        onSearch={setEmailSearch}
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
        emptyMessage="No blueprints found."
      />

      {selected && (
        <DetailView
          title={`Blueprint: ${selected.id}`}
          recordType="blueprint"
          recordId={selected.id}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
