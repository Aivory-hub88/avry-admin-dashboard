"use client";
import React, { useState, useEffect, useCallback } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CreditUsageChart } from "@/components/dashboard/CreditUsageChart";
import { AgentSuccessChart } from "@/components/dashboard/AgentSuccessChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadReports } from "@/hooks/useUnreadReports";

interface KpiData {
  activeUsers: number;
  workflowRunsToday: number;
  workflowRunsLast7Days: number;
  workflowRunsLast30Days: number;
  creditUsageSeries: Array<{ date: string; credits: number }>;
  agentSuccessRate: { success: number; failed: number; running: number };
  recentActivity: Array<{
    id: string;
    type: string;
    userId: string;
    description: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const { count: unreadReports } = useUnreadReports();

  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpi = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/admin/api/admin/kpi");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load KPI data (${res.status})`);
      }
      const data: KpiData = await res.json();
      setKpiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KPI data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  return (
    <div className="space-y-6">
      {/* Unread reports banner — superadmin only */}
      {role === "superadmin" && unreadReports > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{
            background: "rgba(240, 68, 56, 0.08)",
            borderColor: "rgba(240, 68, 56, 0.3)",
          }}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: "#f04438", color: "#fff" }}
          >
            {unreadReports}
          </span>
          <p className="text-sm" style={{ color: "#f7f7f7" }}>
            You have{" "}
            <strong style={{ color: "#f04438" }}>
              {unreadReports} unread report{unreadReports !== 1 ? "s" : ""}
            </strong>{" "}
            escalated by admins.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Active Users"
          value={kpiData?.activeUsers ?? null}
          isLoading={isLoading}
          error={error ?? undefined}
          onRetry={fetchKpi}
        />
        <KpiCard
          title="Workflow Runs Today"
          value={kpiData?.workflowRunsToday ?? null}
          isLoading={isLoading}
          error={error ?? undefined}
          onRetry={fetchKpi}
        />
        <KpiCard
          title="Runs Last 7 Days"
          value={kpiData?.workflowRunsLast7Days ?? null}
          isLoading={isLoading}
          error={error ?? undefined}
          onRetry={fetchKpi}
        />
        <KpiCard
          title="Runs Last 30 Days"
          value={kpiData?.workflowRunsLast30Days ?? null}
          isLoading={isLoading}
          error={error ?? undefined}
          onRetry={fetchKpi}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isLoading ? (
            <div
              className="rounded-2xl border p-5 animate-pulse"
              style={{
                background: "#2a2a27",
                borderColor: "rgba(255,255,255,0.07)",
                height: 280,
              }}
            >
              <div
                className="h-4 w-1/3 rounded mb-4"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <div
                className="h-48 rounded"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border p-5 flex items-center justify-center"
              style={{
                background: "#2a2a27",
                borderColor: "rgba(255,255,255,0.07)",
                height: 280,
              }}
            >
              <p className="text-sm" style={{ color: "#f04438" }}>
                {error}
              </p>
            </div>
          ) : kpiData ? (
            <CreditUsageChart series={kpiData.creditUsageSeries} />
          ) : null}
        </div>

        <div>
          {isLoading ? (
            <div
              className="rounded-2xl border p-5 animate-pulse"
              style={{
                background: "#2a2a27",
                borderColor: "rgba(255,255,255,0.07)",
                height: 280,
              }}
            >
              <div
                className="h-4 w-1/2 rounded mb-4"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <div
                className="h-48 rounded-full mx-auto"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  width: 160,
                }}
              />
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border p-5 flex items-center justify-center"
              style={{
                background: "#2a2a27",
                borderColor: "rgba(255,255,255,0.07)",
                height: 280,
              }}
            >
              <p className="text-sm" style={{ color: "#f04438" }}>
                {error}
              </p>
            </div>
          ) : kpiData ? (
            <AgentSuccessChart
              success={kpiData.agentSuccessRate.success}
              failed={kpiData.agentSuccessRate.failed}
              running={kpiData.agentSuccessRate.running}
            />
          ) : null}
        </div>
      </div>

      {/* Recent Activity */}
      {isLoading ? (
        <div
          className="rounded-2xl border p-5 animate-pulse"
          style={{
            background: "#2a2a27",
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="h-4 w-1/4 rounded mb-4"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded mb-2"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="rounded-2xl border p-5 flex items-center justify-center"
          style={{
            background: "#2a2a27",
            borderColor: "rgba(255,255,255,0.07)",
            minHeight: 120,
          }}
        >
          <p className="text-sm" style={{ color: "#f04438" }}>
            {error}
          </p>
        </div>
      ) : kpiData ? (
        <RecentActivityTable activities={kpiData.recentActivity} />
      ) : null}
    </div>
  );
}
