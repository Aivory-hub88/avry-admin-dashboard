"use client";
import React, { useState, useEffect, useCallback } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import DetailView from "@/components/shared/DetailView";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

interface LogEntry extends Record<string, unknown> {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  details?: Record<string, unknown>;
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

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [levelFilter, setLevelFilter] = useState("all");
  const [messageSearch, setMessageSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/logs");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
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
  }, []);

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
      <h1 className="text-xl font-semibold text-white">Execution Logs</h1>

      <DataTable
        columns={columns}
        data={filteredLogs}
        onRowClick={(row) => setSelectedLog(row)}
        pageSize={25}
        searchPlaceholder="Search messages and sources..."
        onSearch={setMessageSearch}
        filterSlot={
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
