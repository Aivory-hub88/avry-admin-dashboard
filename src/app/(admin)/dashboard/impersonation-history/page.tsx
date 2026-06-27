"use client";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import { bffFetch } from "@/lib/bff";
import { apiFetch } from "@/lib/api";

interface ImpersonationHistoryEntry extends Record<string, unknown> {
  session_id: string;
  admin_user_id: string;
  target_user_id: string;
  target_email: string;
  access_mode: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_requests: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  expired: "bg-yellow-500/20 text-yellow-400",
  terminated: "bg-red-500/20 text-red-400",
};

const ACCESS_MODE_LABELS: Record<string, string> = {
  read_only: "Read-Only",
  full_access: "Full Access",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
];

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

const columns: Column<ImpersonationHistoryEntry>[] = [
  {
    key: "admin_user_id",
    header: "Admin User",
    width: "160px",
    render: (row) => (
      <span className="font-mono text-xs text-gray-300" title={row.admin_user_id}>
        {row.admin_user_id.length > 16
          ? `${row.admin_user_id.slice(0, 16)}…`
          : row.admin_user_id}
      </span>
    ),
  },
  {
    key: "target_email",
    header: "Target User",
    render: (row) => (
      <span className="text-gray-200">{row.target_email}</span>
    ),
  },
  {
    key: "duration_seconds",
    header: "Duration",
    width: "100px",
    render: (row) => (
      <span className="text-gray-300">{formatDuration(row.duration_seconds)}</span>
    ),
  },
  {
    key: "access_mode",
    header: "Access Mode",
    width: "120px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          row.access_mode === "read_only"
            ? "bg-blue-500/20 text-blue-400"
            : "bg-purple-500/20 text-purple-400"
        }`}
      >
        {ACCESS_MODE_LABELS[row.access_mode] ?? row.access_mode}
      </span>
    ),
  },
  {
    key: "total_requests",
    header: "Actions",
    width: "90px",
    render: (row) => (
      <span className="text-gray-300">{row.total_requests.toLocaleString()}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "110px",
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
          STATUS_COLORS[row.status] ?? "bg-gray-500/20 text-gray-400"
        }`}
      >
        {row.status}
      </span>
    ),
  },
  {
    key: "started_at",
    header: "Started",
    width: "160px",
    render: (row) => {
      if (!row.started_at) return "—";
      const d = new Date(row.started_at);
      return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
];

export default function ImpersonationHistoryPage() {
  const [sessions, setSessions] = useState<ImpersonationHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ImpersonationHistoryEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [terminating, setTerminating] = useState(false);
  const pageSize = 20;

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const res = await bffFetch(
        `/api/admin/impersonation-history?limit=${pageSize}&offset=${offset}`
      );
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load impersonation history (${res.status})`);
      }
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load impersonation history");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredSessions = sessions.filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSearch =
      search === "" ||
      s.target_email.toLowerCase().includes(search.toLowerCase()) ||
      s.admin_user_id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const detailData = selectedSession
    ? {
        "Session ID": selectedSession.session_id,
        "Admin User": selectedSession.admin_user_id,
        "Target User": selectedSession.target_email,
        "Target User ID": selectedSession.target_user_id,
        "Access Mode": ACCESS_MODE_LABELS[selectedSession.access_mode] ?? selectedSession.access_mode,
        Status: selectedSession.status,
        "Started At": new Date(selectedSession.started_at).toLocaleString(),
        "Ended At": selectedSession.ended_at
          ? new Date(selectedSession.ended_at).toLocaleString()
          : "—",
        Duration: formatDuration(selectedSession.duration_seconds),
        "Total Requests": selectedSession.total_requests,
      }
    : {};

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchHistory} />;

  const activeSessions = sessions.filter((s) => s.status === "active");
  const checkedActive = [...checked].filter((id) =>
    activeSessions.some((s) => s.session_id === id)
  );

  const toggleCheck = (sessionId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === activeSessions.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(activeSessions.map((s) => s.session_id)));
    }
  };

  const handleTerminateSelected = async () => {
    if (checkedActive.length === 0) return;
    setTerminating(true);
    try {
      await apiFetch("/api/v1/impersonation/terminate-sessions", {
        method: "POST",
        body: JSON.stringify({ session_ids: checkedActive }),
      });
      setChecked(new Set());
      fetchHistory();
    } catch {
      // refresh anyway
      fetchHistory();
    } finally {
      setTerminating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Impersonation History</h1>
        <div className="flex items-center gap-3">
          {activeSessions.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked.size === activeSessions.length && activeSessions.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-600"
                />
                Select All Active ({activeSessions.length})
              </label>
              {checkedActive.length > 0 && (
                <button
                  onClick={handleTerminateSelected}
                  disabled={terminating}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {terminating ? "Ending..." : `End ${checkedActive.length} Session${checkedActive.length > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          )}
          <span className="text-sm text-gray-400">
            {total} session{total !== 1 ? "s" : ""} total
          </span>
        </div>
      </div>

      {/* Active sessions with checkboxes */}
      {activeSessions.length > 0 && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
          <p className="text-xs font-medium text-orange-400 mb-2">Active Sessions</p>
          <div className="space-y-1">
            {activeSessions.map((s) => (
              <label key={s.session_id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={checked.has(s.session_id)}
                  onChange={() => toggleCheck(s.session_id)}
                  className="rounded border-gray-600"
                />
                <span className="text-gray-300">{s.target_email}</span>
                <span className="text-gray-500 text-xs">({s.access_mode === "read_only" ? "Read-Only" : "Full Access"})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredSessions}
        onRowClick={(row) => setSelectedSession(row)}
        pageSize={pageSize}
        searchPlaceholder="Search by admin or target email..."
        onSearch={setSearch}
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
        emptyMessage="No impersonation sessions found."
      />

      {/* Server-side pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#2a2a27] px-4 py-3">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40 hover:bg-white/5"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40 hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedSession && (
        <DetailView
          title={`Session: ${selectedSession.session_id}`}
          recordType="impersonation_session"
          recordId={selectedSession.session_id}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
