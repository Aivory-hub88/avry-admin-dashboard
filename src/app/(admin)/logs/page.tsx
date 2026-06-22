"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import { apiFetch } from "@/lib/api";
import { bffFetch } from "@/lib/bff";

interface LogEntry extends Record<string, unknown> {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ImpersonationStatus {
  active: boolean;
  session_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  access_mode: string | null;
  expires_at: string | null;
  remaining_seconds: number | null;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warn: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
};

const LEVEL_OPTIONS = [
  { value: "all", label: "All Levels" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "impersonation-monitor", label: "Impersonation Only" },
];

const columns: Column<LogEntry>[] = [
  {
    key: "timestamp",
    header: "Timestamp",
    width: "160px",
    render: (row) =>
      new Date(row.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
  },
  {
    key: "level",
    header: "Level",
    width: "80px",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${LEVEL_COLORS[row.level] ?? ""}`}>
        {row.level}
      </span>
    ),
  },
  { key: "source", header: "Source", width: "160px" },
  {
    key: "message",
    header: "Message",
    render: (row) => (
      <span className="text-gray-200 text-sm">{row.message}</span>
    ),
  },
];

/**
 * ActiveImpersonationIndicator — Displays a pulsing live indicator when
 * impersonation sessions are currently active. Polls the impersonation
 * status endpoint for real-time updates.
 *
 * Requirements: 6.5
 */
function ActiveImpersonationIndicator() {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch<ImpersonationStatus>(
        "/api/v1/impersonation/status"
      );
      setStatus(data);
    } catch {
      // Silently handle — indicator is non-critical
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 10 seconds for live updates
    pollRef.current = setInterval(fetchStatus, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  if (!status || !status.active) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label="Active impersonation session"
    >
      {/* Pulsing dot indicator */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
      </span>
      <span className="text-xs font-medium text-orange-300">
        Live: Impersonating{" "}
        <span className="font-semibold text-orange-200">
          {status.target_email}
        </span>
      </span>
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [messageSearch, setMessageSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") {
        params.set("source", sourceFilter);
      }
      const query = params.toString();
      const url = `/api/admin/logs${query ? `?${query}` : ""}`;

      const res = await bffFetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load logs (${res.status})`);
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((l) => {
    const matchesLevel = levelFilter === "all" || l.level === levelFilter;
    const matchesSearch =
      messageSearch === "" ||
      l.message.toLowerCase().includes(messageSearch.toLowerCase()) ||
      l.source.toLowerCase().includes(messageSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const detailData = selectedLog
    ? {
        ID: selectedLog.id,
        Timestamp: new Date(selectedLog.timestamp).toLocaleString(),
        Level: selectedLog.level,
        Source: selectedLog.source,
        Message: selectedLog.message,
        Details: selectedLog.details ?? null,
      }
    : {};

  if (isLoading) return <LoadingSkeleton rows={10} />;
  if (error) return <ErrorState message={error} onRetry={fetchLogs} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Execution Logs</h1>
        <ActiveImpersonationIndicator />
      </div>

      <DataTable
        columns={columns}
        data={filteredLogs}
        onRowClick={(row) => setSelectedLog(row)}
        pageSize={25}
        searchPlaceholder="Search messages and sources..."
        onSearch={setMessageSearch}
        filterSlot={
          <div className="flex items-center gap-2">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              aria-label="Filter by source"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
        emptyMessage="No log entries found."
      />

      {selectedLog && (
        <DetailView
          title={`Log: ${selectedLog.id}`}
          recordType="log"
          recordId={selectedLog.id}
          data={detailData as Record<string, unknown>}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
