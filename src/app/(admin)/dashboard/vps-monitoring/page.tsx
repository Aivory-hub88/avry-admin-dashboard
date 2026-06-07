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

  const fetchSystemMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cpuRes, memRes, memTotalRes, diskRes, netRxRes, healthRes] =
        await Promise.all([
          queryPrometheus(
            '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
          ),
          queryPrometheus(
            '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
          ),
          queryPrometheus("node_memory_MemTotal_bytes"),
          queryPrometheus(
            '(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100'
          ),
          queryPrometheus("rate(node_network_receive_bytes_total[5m])"),
          queryPrometheus('up{job="service_health"}'),
        ]);

      setCpuUsage(parseInstantValue(cpuRes.data?.result || []));
      setMemUsage(parseInstantValue(memRes.data?.result || []));
      setMemTotal(parseInstantValue(memTotalRes.data?.result || []));
      setDiskUsage(parseInstantValue(diskRes.data?.result || []));

      // Sum network across interfaces
      const netResults = netRxRes.data?.result || [];
      const totalNet = netResults.reduce(
        (sum: number, r: PrometheusResult) =>
          sum + (parseFloat(r.value?.[1] || "0") || 0),
        0
      );
      setNetworkRx(totalNet);

      // Parse service health
      const healthResults = healthRes.data?.result || [];
      const serviceList: ServiceStatus[] = healthResults.map(
        (r: PrometheusResult) => {
          const instance = r.metric.instance || "";
          const name = instance.split(":")[0].replace("avry-", "");
          const isUp = parseFloat(r.value?.[1] || "0") === 1;
          return {
            name: name || instance,
            status: isUp ? ("up" as const) : ("down" as const),
          };
        }
      );
      setServices(serviceList.length > 0 ? serviceList : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 15000);
    return () => clearInterval(interval);
  }, [fetchSystemMetrics]);

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
