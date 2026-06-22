"use client";
import React, { useEffect, useState, useCallback } from "react";
import { queryPrometheus, PrometheusResult } from "@/lib/monitoring";

interface UserUsage {
  userId: string;
  tier: string;
  cpuSeconds: number;
  memoryBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

interface UserUsageTableProps {
  selectedUserId: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatCPU(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function UserUsageTable({ selectedUserId }: UserUsageTableProps) {
  const [usages, setUsages] = useState<UserUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query — if a specific user is selected, filter by user_id
      const userFilter = selectedUserId ? `user_id="${selectedUserId}"` : "";
      const labelSelector = userFilter ? `{${userFilter}}` : "";

      const [cpuRes, memRes, rxRes, txRes] = await Promise.all([
        queryPrometheus(`avry_user_cpu_seconds_total${labelSelector}`),
        queryPrometheus(`avry_user_memory_rss_bytes${labelSelector}`),
        queryPrometheus(`avry_user_network_receive_bytes_total${labelSelector}`),
        queryPrometheus(`avry_user_network_transmit_bytes_total${labelSelector}`),
      ]);

      // Aggregate by user_id
      const userMap: Record<string, UserUsage> = {};

      const processResults = (
        results: PrometheusResult[],
        field: keyof Omit<UserUsage, "userId" | "tier">
      ) => {
        for (const r of results) {
          const userId = r.metric.user_id;
          if (!userId) continue;

          if (!userMap[userId]) {
            userMap[userId] = {
              userId,
              tier: r.metric.user_tier || "unknown",
              cpuSeconds: 0,
              memoryBytes: 0,
              networkRxBytes: 0,
              networkTxBytes: 0,
            };
          }
          // Sum across containers for same user
          userMap[userId][field] += parseFloat(r.value?.[1] || "0") || 0;
        }
      };

      processResults(cpuRes.data?.result || [], "cpuSeconds");
      processResults(memRes.data?.result || [], "memoryBytes");
      processResults(rxRes.data?.result || [], "networkRxBytes");
      processResults(txRes.data?.result || [], "networkTxBytes");

      const sorted = Object.values(userMap).sort((a, b) => b.cpuSeconds - a.cpuSeconds);
      setUsages(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user usage");
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchUsage();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="h-4 w-1/3 rounded mb-4" style={{ background: "rgba(255,255,255,0.08)" }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded mb-2" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: "#f7f7f7" }}>
          {selectedUserId ? "User Resource Usage" : "Per-User Resource Usage"}
        </h3>
        <p className="text-xs" style={{ color: "#f5a623" }}>{error}</p>
        <button
          onClick={fetchUsage}
          className="mt-2 px-3 py-1 text-xs rounded-md border"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a3a3a0" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "#f7f7f7" }}>
          {selectedUserId ? `Usage: ${selectedUserId}` : "Per-User Resource Usage"}
        </h3>
        <span className="text-xs" style={{ color: "#6b6b68" }}>
          {usages.length} user{usages.length !== 1 ? "s" : ""} active
        </span>
      </div>

      {usages.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "#6b6b68" }}>
          No user container data available
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: "#6b6b68" }}>
                <th className="pb-2 font-medium">User ID</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium text-right">CPU</th>
                <th className="pb-2 font-medium text-right">Memory</th>
                <th className="pb-2 font-medium text-right">Net RX</th>
                <th className="pb-2 font-medium text-right">Net TX</th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u) => (
                <tr key={u.userId} className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <td className="py-2.5 font-mono text-xs" style={{ color: "#f7f7f7" }}>
                    {u.userId.length > 16 ? `${u.userId.slice(0, 16)}…` : u.userId}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: u.tier === "paid" ? "rgba(0, 229, 158, 0.12)" : "rgba(255,255,255,0.06)",
                        color: u.tier === "paid" ? "#00e59e" : "#a3a3a0",
                      }}
                    >
                      {u.tier}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs" style={{ color: "#f7f7f7" }}>
                    {formatCPU(u.cpuSeconds)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs" style={{ color: "#f7f7f7" }}>
                    {formatBytes(u.memoryBytes)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs" style={{ color: "#f7f7f7" }}>
                    {formatBytes(u.networkRxBytes)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs" style={{ color: "#f7f7f7" }}>
                    {formatBytes(u.networkTxBytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
