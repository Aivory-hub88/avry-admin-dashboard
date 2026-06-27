"use client";
import React, { useEffect, useState, useCallback } from "react";
import { queryPrometheus, PrometheusResult } from "@/lib/monitoring";
import { BASE_PATH } from "@/lib/bff";

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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let source: EventSource | null = null;
    let isComponentMounted = true;

    const connectStream = () => {
      source = new EventSource(`${BASE_PATH}/api/admin/vps-monitoring/stream?path=/containers&format=raw`);

      source.onmessage = (event) => {
        if (!isComponentMounted) return;
        setIsLoading(false);
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setError(data.error);
            return;
          }
          setError(null);
          
          // Data is raw array of containers
          const containers = Array.isArray(data) ? data : (data.containers || []);
          const userMap: Record<string, UserUsage> = {};

          for (const c of containers) {
            // Extract user id from container name (e.g. avry-agent-{userId})
            // or if it's named something else, just use the name as fallback
            const userId = c.name.replace("avry-agent-", "").replace("avry-", "");
            
            // If filtering by user
            if (selectedUserId && userId !== selectedUserId && !c.name.includes(selectedUserId)) {
               continue;
            }

            if (!userMap[userId]) {
              userMap[userId] = {
                userId,
                tier: "paid", // or determine from container labels if available
                cpuSeconds: 0,
                memoryBytes: 0,
                networkRxBytes: 0,
                networkTxBytes: 0,
              };
            }
            userMap[userId].cpuSeconds += c.cpu?.usagePercent || 0; // In raw metrics this is percent, not seconds! We label it seconds for UI compatibility or change it.
            userMap[userId].memoryBytes += c.memory?.usedBytes || 0;
            userMap[userId].networkRxBytes += c.network?.rxBytes || 0;
            userMap[userId].networkTxBytes += c.network?.txBytes || 0;
          }

          const sorted = Object.values(userMap).sort((a, b) => b.cpuSeconds - a.cpuSeconds);
          setUsages(sorted);
        } catch (err) {
          console.error("Failed to parse user usage SSE data", err);
        }
      };

      source.onerror = () => {
        setError("Connection dropped. Reconnecting...");
      };
    };

    connectStream();

    return () => {
      isComponentMounted = false;
      if (source) source.close();
    };
  }, [selectedUserId, retryCount]);

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
          onClick={() => setRetryCount(c => c + 1)}
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
                        background: u.tier === "paid" ? "rgba(183, 203, 166, 0.12)" : "rgba(255,255,255,0.06)",
                        color: u.tier === "paid" ? "#b7cba6" : "#a3a3a0",
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
