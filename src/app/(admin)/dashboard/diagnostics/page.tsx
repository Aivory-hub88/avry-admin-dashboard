"use client";
import { bffFetch } from "@/lib/bff";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface DiagnosticRun extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  type: "free" | "deep";
  status: "completed" | "in_progress" | "failed";
  score: number | null;
  phases: number;
  completedPhases: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface DiagnosticStats {
  total_runs: number;
  average_score: number;
  min_score: number;
  max_score: number;
  category_distribution?: {
    advanced: number;
    established: number;
    emerging: number;
    foundational: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-[#b7cba6]/20 text-[#b7cba6]",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  failed: "bg-red-500/20 text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  deep: "bg-purple-500/20 text-purple-400",
  free: "bg-blue-500/20 text-blue-400",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "failed", label: "Failed" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "deep", label: "Deep" },
  { value: "free", label: "Free" },
];

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-500">—</span>;
  const color =
    score >= 80
      ? "text-[#b7cba6]"
      : score >= 60
        ? "text-yellow-400"
        : "text-red-400";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

const columns: Column<DiagnosticRun>[] = [
  { key: "userEmail", header: "User" },
  {
    key: "type",
    header: "Type",
    width: "90px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_COLORS[row.type] ?? ""}`}
      >
        {row.type}
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
    key: "score",
    header: "Score",
    width: "80px",
    render: (row) => <ScoreBadge score={row.score} />,
  },
  {
    key: "phases",
    header: "Progress",
    width: "100px",
    render: (row) => (
      <span className="text-gray-300 text-sm">
        {row.completedPhases}/{row.phases} phases
      </span>
    ),
  },
  {
    key: "durationMs",
    header: "Duration",
    width: "100px",
    render: (row) => (
      <span className="text-gray-400 text-sm">{formatDuration(row.durationMs)}</span>
    ),
  },
  {
    key: "startedAt",
    header: "Started At",
    width: "160px",
    render: (row) =>
      new Date(row.startedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
];

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticRun[]>([]);
  const [stats, setStats] = useState<DiagnosticStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiagnosticRun | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [emailSearch, setEmailSearch] = useState("");

  const fetchDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch from BFF route which proxies to diagnostics service
      const res = await bffFetch("/api/admin/diagnostics");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load diagnostics (${res.status})`);
      }
      const data = await res.json();
      setDiagnostics(data.diagnostics ?? []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diagnostics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const filtered = diagnostics.filter((d) => {
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesType = typeFilter === "all" || d.type === typeFilter;
    const matchesEmail =
      emailSearch === "" ||
      d.userEmail.toLowerCase().includes(emailSearch.toLowerCase());
    return matchesStatus && matchesType && matchesEmail;
  });

  const detailData = selected
    ? {
        ID: selected.id,
        "User ID": selected.userId,
        Email: selected.userEmail,
        Tier: selected.tier,
        Type: selected.type,
        Status: selected.status,
        Score: selected.score ?? "—",
        Phases: `${selected.completedPhases} / ${selected.phases}`,
        Duration: formatDuration(selected.durationMs),
        "Started At": new Date(selected.startedAt).toLocaleString(),
        "Completed At": selected.completedAt
          ? new Date(selected.completedAt).toLocaleString()
          : "—",
      }
    : {};

  // KPI summary
  const total = diagnostics.length;
  const completed = diagnostics.filter((d) => d.status === "completed").length;
  const inProgress = diagnostics.filter((d) => d.status === "in_progress").length;
  const failed = diagnostics.filter((d) => d.status === "failed").length;
  const avgScore =
    diagnostics.filter((d) => d.score !== null).length > 0
      ? Math.round(
          diagnostics
            .filter((d) => d.score !== null)
            .reduce((sum, d) => sum + (d.score ?? 0), 0) /
            diagnostics.filter((d) => d.score !== null).length
        )
      : null;

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchDiagnostics} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Diagnostic Monitoring</h1>
        {stats && (
          <div className="text-sm text-gray-400">
            Avg Score: <span className="text-[#b7cba6] font-semibold">{stats.average_score.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Runs", value: total, color: "text-white" },
          { label: "Completed", value: completed, color: "text-[#b7cba6]" },
          { label: "In Progress", value: inProgress, color: "text-yellow-400" },
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

      {avgScore !== null && (
        <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Avg Score (all runs)
          </span>
          <ScoreBadge score={avgScore} />
        </div>
      )}

      {stats?.category_distribution && (
        <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-4">
          <p className="text-sm font-medium text-gray-300 mb-3">Category Distribution</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-[#b7cba6]">🟢 Advanced</span>
              <p className="text-lg font-semibold text-white">{stats.category_distribution.advanced}</p>
            </div>
            <div>
              <span className="text-blue-400">🔵 Established</span>
              <p className="text-lg font-semibold text-white">{stats.category_distribution.established}</p>
            </div>
            <div>
              <span className="text-yellow-400">🟡 Emerging</span>
              <p className="text-lg font-semibold text-white">{stats.category_distribution.emerging}</p>
            </div>
            <div>
              <span className="text-red-400">🔴 Foundational</span>
              <p className="text-lg font-semibold text-white">{stats.category_distribution.foundational}</p>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
        pageSize={20}
        searchPlaceholder="Search by email..."
        onSearch={setEmailSearch}
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        }
        emptyMessage="No diagnostic runs found."
      />

      {selected && (
        <DetailView
          title={`Diagnostic: ${selected.id}`}
          recordType="diagnostic"
          recordId={selected.id}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
