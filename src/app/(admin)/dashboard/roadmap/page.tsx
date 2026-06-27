"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface RoadmapItem extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  title: string;
  category: "automation" | "integration" | "ai_agent" | "analytics" | "infrastructure";
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "deferred";
  estimatedWeeks: number;
  completionPercent: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-[#b7cba6]/20 text-[#b7cba6]",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  pending: "bg-white/10 text-gray-300",
  deferred: "bg-orange-500/20 text-orange-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-blue-500/20 text-blue-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  automation: "Automation",
  integration: "Integration",
  ai_agent: "AI Agent",
  analytics: "Analytics",
  infrastructure: "Infrastructure",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "deferred", label: "Deferred" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#b7cba6]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{percent}%</span>
    </div>
  );
}

const columns: Column<RoadmapItem>[] = [
  {
    key: "title",
    header: "Initiative",
    render: (row) => (
      <span className="text-gray-200 text-sm leading-snug">{row.title}</span>
    ),
  },
  { key: "userEmail", header: "User", width: "180px" },
  {
    key: "category",
    header: "Category",
    width: "120px",
    render: (row) => (
      <span className="text-xs text-gray-300">
        {CATEGORY_LABELS[row.category] ?? row.category}
      </span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    width: "90px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[row.priority] ?? ""}`}
      >
        {row.priority}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "120px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[row.status] ?? ""}`}
      >
        {row.status.replace("_", " ")}
      </span>
    ),
  },
  {
    key: "completionPercent",
    header: "Progress",
    width: "140px",
    render: (row) => <ProgressBar percent={row.completionPercent} />,
  },
  {
    key: "estimatedWeeks",
    header: "Est.",
    width: "70px",
    render: (row) => (
      <span className="text-gray-400 text-sm">{row.estimatedWeeks}w</span>
    ),
  },
];

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RoadmapItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchRoadmap = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bffFetch("/api/admin/roadmap");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load roadmap (${res.status})`);
      }
      const data = await res.json();
      setItems(data.roadmap ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const filtered = items.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    const matchesSearch =
      search === "" ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.userEmail.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const detailData = selected
    ? {
        ID: selected.id,
        "User ID": selected.userId,
        Email: selected.userEmail,
        Tier: selected.tier,
        Title: selected.title,
        Category: CATEGORY_LABELS[selected.category] ?? selected.category,
        Priority: selected.priority,
        Status: selected.status,
        "Completion %": `${selected.completionPercent}%`,
        "Estimated Weeks": selected.estimatedWeeks,
        "Created At": new Date(selected.createdAt).toLocaleString(),
        "Updated At": new Date(selected.updatedAt).toLocaleString(),
      }
    : {};

  // KPI summary
  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const highPriority = items.filter((i) => i.priority === "high").length;

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchRoadmap} />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Roadmap Monitoring</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Initiatives", value: total, color: "text-white" },
          { label: "Completed", value: completed, color: "text-[#b7cba6]" },
          { label: "In Progress", value: inProgress, color: "text-yellow-400" },
          { label: "High Priority", value: highPriority, color: "text-red-400" },
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
        searchPlaceholder="Search by title or email..."
        onSearch={setSearch}
        filterSlot={
          <>
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
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        }
        emptyMessage="No roadmap items found."
      />

      {selected && (
        <DetailView
          title={`Roadmap: ${selected.id}`}
          recordType="roadmap"
          recordId={selected.id}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
