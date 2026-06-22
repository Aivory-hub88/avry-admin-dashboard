"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MetricCard } from "@/components/vps-monitoring/MetricCard";
import { UserSelector } from "@/components/vps-monitoring/UserSelector";
import { TimeRangeSelector } from "@/components/vps-monitoring/TimeRangeSelector";
import { ServiceHealthTable } from "@/components/vps-monitoring/ServiceHealthTable";
import { ResourceChart } from "@/components/vps-monitoring/ResourceChart";
import { UserUsageTable } from "@/components/vps-monitoring/UserUsageTable";
import {
  queryPrometheus,
  parseInstantValue,
  PrometheusResult,
} from "@/lib/monitoring";
import { BASE_PATH } from "@/lib/bff";

interface ServiceStatus {
  name: string;
  status: "up" | "down" | "unknown";
  latency?: number;
}

function getStatus(val: number): "normal" | "warning" | "critical" {
  if (val >= 90) return "critical";
  if (val >= 75) return "warning";
  return "normal";
}

function getMemStatus(availPct: number): "normal" | "warning" | "critical" {
  if (availPct <= 10) return "critical";
  if (availPct <= 20) return "warning";
  return "normal";
}

export default function VpsMonitoringPage() {
  const { role } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("1h");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // System metrics state
  const [cpuUsage, setCpuUsage] = useState<number | null>(null);
  const [memUsage, setMemUsage] = useState<number | null>(null);
  const [memTotal, setMemTotal] = useState<number | null>(null);
  const [diskUsage, setDiskUsage] = useState<number | null>(null);
  const [networkRx, setNetworkRx] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);

  useEffect(() => {
    let systemSource: EventSource | null = null;
    let healthSource: EventSource | null = null;
    let isComponentMounted = true;

    const connectStreams = () => {
      // 1. System Metrics Stream
      systemSource = new EventSource(`${BASE_PATH}/api/admin/vps-monitoring/stream?path=/system&format=raw`);
      
      systemSource.onmessage = (event) => {
        if (!isComponentMounted) return;
        setIsLoading(false);
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setError(data.error);
            return;
          }
          setError(null);
          // Data is raw VpsPanelSystemMetrics
          setCpuUsage(data.cpu.usagePercent);
          
          const memPct = data.memory.totalBytes > 0 
            ? (data.memory.usedBytes / data.memory.totalBytes) * 100 
            : 0;
          setMemUsage(memPct);
          setMemTotal(data.memory.totalBytes);
          
          const diskPct = data.disk.totalBytes > 0
            ? (data.disk.usedBytes / data.disk.totalBytes) * 100
            : 0;
          setDiskUsage(diskPct);
          setNetworkRx(data.network.rxBytesPerSec);
        } catch (err) {
          console.error("Failed to parse SSE data", err);
        }
      };

      systemSource.onerror = () => {
        // SSE auto-reconnects, but we can set an error state if we want
        setError("Connection dropped. Reconnecting...");
      };

      // 2. Health Metrics Stream
      healthSource = new EventSource(`${BASE_PATH}/api/admin/vps-monitoring/stream?path=/health&format=raw`);
      
      healthSource.onmessage = (event) => {
        if (!isComponentMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.error) return;
          // Health data returns an array of containers from vps-panel
          if (Array.isArray(data)) {
            setServices(data.map((s: any) => ({
              name: s.name.replace("avry-", ""),
              status: s.status === "running" ? "up" : s.status === "exited" ? "down" : "unknown",
            })));
          }
        } catch (err) {
          console.error("Failed to parse health SSE data", err);
        }
      };
    };

    connectStreams();

    return () => {
      isComponentMounted = false;
      if (systemSource) systemSource.close();
      if (healthSource) healthSource.close();
    };
  }, []);

  // Determine visibility label
  const viewLabel = selectedUserId
    ? `Viewing: ${selectedUserId}`
    : "Global View (All Users)";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#f7f7f7" }}>
            VPS Monitoring
          </h1>
          <p className="text-xs mt-1" style={{ color: "#6b6b68" }}>
            {viewLabel} • {role === "superadmin" ? "Superadmin" : "Admin"} access
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <UserSelector
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
          />
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-xl border px-4 py-3"
          style={{
            background: "rgba(245, 166, 35, 0.08)",
            borderColor: "rgba(245, 166, 35, 0.3)",
          }}
        >
          <p className="text-sm" style={{ color: "#f5a623" }}>
            ⚠️ {error} — some metrics may be unavailable. The monitoring stack may
            still be starting up.
          </p>
        </div>
      )}

      {/* Global System Metrics — only shown when no user is selected */}
      {!selectedUserId && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="CPU Usage"
              value={cpuUsage != null ? cpuUsage.toFixed(1) : null}
              unit="%"
              status={cpuUsage != null ? getStatus(cpuUsage) : "normal"}
              isLoading={isLoading}
              subtitle="5-minute average"
            />
            <MetricCard
              title="Memory Usage"
              value={memUsage != null ? memUsage.toFixed(1) : null}
              unit="%"
              status={memUsage != null ? getMemStatus(100 - memUsage) : "normal"}
              isLoading={isLoading}
              subtitle={
                memTotal != null
                  ? `of ${(memTotal / (1024 * 1024 * 1024)).toFixed(1)} GB total`
                  : undefined
              }
            />
            <MetricCard
              title="Disk Usage"
              value={diskUsage != null ? diskUsage.toFixed(1) : null}
              unit="%"
              status={diskUsage != null ? getStatus(diskUsage) : "normal"}
              isLoading={isLoading}
              subtitle="Root partition"
            />
            <MetricCard
              title="Network In"
              value={
                networkRx != null
                  ? networkRx > 1048576
                    ? (networkRx / 1048576).toFixed(1)
                    : (networkRx / 1024).toFixed(1)
                  : null
              }
              unit={networkRx != null && networkRx > 1048576 ? "MB/s" : "KB/s"}
              status="normal"
              isLoading={isLoading}
              subtitle="5-minute rate"
            />
          </div>

          {/* System Charts */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ResourceChart
              title="CPU Usage Over Time"
              query='100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
              timeRange={timeRange}
              unit="%"
              color="#00e59e"
              formatValue={(val: number) => `${val.toFixed(1)}%`}
            />
            <ResourceChart
              title="Memory Usage Over Time"
              query='(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
              timeRange={timeRange}
              unit="%"
              color="#a78bfa"
              formatValue={(val: number) => `${val.toFixed(1)}%`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ResourceChart
              title="Network I/O (Receive)"
              query="rate(node_network_receive_bytes_total[5m])"
              timeRange={timeRange}
              unit="B/s"
              color="#38bdf8"
              formatValue={(val: number) =>
                val > 1048576
                  ? `${(val / 1048576).toFixed(1)} MB/s`
                  : `${(val / 1024).toFixed(1)} KB/s`
              }
            />
            <ResourceChart
              title="Disk I/O (Read)"
              query="rate(node_disk_read_bytes_total[5m])"
              timeRange={timeRange}
              unit="B/s"
              color="#f5a623"
              formatValue={(val: number) =>
                val > 1048576
                  ? `${(val / 1048576).toFixed(1)} MB/s`
                  : `${(val / 1024).toFixed(1)} KB/s`
              }
            />
          </div>

          {/* Service Health */}
          <ServiceHealthTable services={services} isLoading={isLoading} />
        </>
      )}

      {/* Per-User Metrics — shown for both global and filtered view */}
      {selectedUserId && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ResourceChart
            title={`CPU Usage — ${selectedUserId}`}
            query='avry_user_cpu_seconds_total'
            timeRange={timeRange}
            userId={selectedUserId}
            unit="s"
            color="#00e59e"
            formatValue={(val: number) => `${val.toFixed(2)}s`}
          />
          <ResourceChart
            title={`Memory Usage — ${selectedUserId}`}
            query='avry_user_memory_rss_bytes'
            timeRange={timeRange}
            userId={selectedUserId}
            unit="B"
            color="#a78bfa"
            formatValue={(val: number) =>
              val > 1073741824
                ? `${(val / 1073741824).toFixed(2)} GB`
                : `${(val / 1048576).toFixed(1)} MB`
            }
          />
          <ResourceChart
            title={`Network Receive — ${selectedUserId}`}
            query='avry_user_network_receive_bytes_total'
            timeRange={timeRange}
            userId={selectedUserId}
            unit="B"
            color="#38bdf8"
            formatValue={(val: number) =>
              val > 1073741824
                ? `${(val / 1073741824).toFixed(2)} GB`
                : `${(val / 1048576).toFixed(1)} MB`
            }
          />
          <ResourceChart
            title={`Network Transmit — ${selectedUserId}`}
            query='avry_user_network_transmit_bytes_total'
            timeRange={timeRange}
            userId={selectedUserId}
            unit="B"
            color="#f5a623"
            formatValue={(val: number) =>
              val > 1073741824
                ? `${(val / 1073741824).toFixed(2)} GB`
                : `${(val / 1048576).toFixed(1)} MB`
            }
          />
        </div>
      )}

      {/* User Usage Table */}
      <UserUsageTable selectedUserId={selectedUserId} />
    </div>
  );
}
