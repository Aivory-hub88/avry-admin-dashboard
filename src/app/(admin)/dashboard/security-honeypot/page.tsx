"use client";
import React, { useState, useEffect, useCallback } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import DataTable, { Column } from "@/components/shared/DataTable";
import ErrorState from "@/components/shared/ErrorState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

export default function SecurityHoneypotPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/honeypot");
      if (!res.ok) {
        throw new Error("Failed to fetch honeypot stats");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (isLoading && !data) {
    return <LoadingSkeleton />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={fetchStats} />;
  }

  const { tarpit, cowrie } = data || {};

  const recentTarpitConnections = tarpit?.recent_connections || [];
  const popularUsernames = cowrie?.popular_usernames?.map(([user, count]: any, i: number) => ({ id: i, user, count })) || [];
  const popularPasswords = cowrie?.popular_passwords?.map(([pass, count]: any, i: number) => ({ id: i, pass, count })) || [];
  const recentLogins = cowrie?.recent_logins?.map((l: any, i: number) => ({ ...l, id: i })) || [];
  const recentCommands = cowrie?.commands?.map((c: any, i: number) => ({ ...c, id: i })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#f7f7f7" }}>
            Security & Honeypot Monitoring
          </h1>
          <p className="text-xs mt-1" style={{ color: "#6b6b68" }}>
            Real-time attack telemetry from SSH Tarpit & Cowrie
          </p>
        </div>
        <div>
           <p className="text-xs text-gray-400">Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Tarpit Wasted Time (Minutes)"
          value={tarpit?.total_time_wasted ? Math.round(tarpit.total_time_wasted / 60) : 0}
          isLoading={isLoading}
        />
        <KpiCard
          title="Tarpit Trapped Scanners"
          value={tarpit?.total_connections || 0}
          isLoading={isLoading}
        />
        <KpiCard
          title="Cowrie SSH Attempts"
          value={cowrie?.login_attempts || 0}
          isLoading={isLoading}
        />
        <KpiCard
          title="Captured Commands"
          value={cowrie?.commands?.length || 0}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-[#2a2a27] border-white/[0.05] shadow-lg">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-lg font-semibold text-white">Recent Tarpit Victims</h2>
            <p className="text-xs text-gray-400">Bots stuck in endless SSH handshake</p>
          </div>
          <div className="p-5">
            <DataTable
              data={recentTarpitConnections}
              columns={[
                { key: "ip", header: "Attacker IP" },
                { key: "duration", header: "Wasted (s)", render: (row: any) => `${row.duration}s` },
                { key: "bytes", header: "Bytes Sent" },
                { key: "start", header: "Time", render: (row: any) => new Date(row.start).toLocaleTimeString() }
              ]}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-[#2a2a27] border-white/[0.05] shadow-lg">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-lg font-semibold text-white">Brute Force Stats</h2>
            <p className="text-xs text-gray-400">Most attempted SSH credentials</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
               <h3 className="text-sm font-medium text-gray-300 mb-2">Top Usernames</h3>
               <DataTable
                  data={popularUsernames}
                  columns={[
                    { key: "user", header: "Username" },
                    { key: "count", header: "Attempts" }
                  ]}
                  isLoading={isLoading}
               />
            </div>
            <div>
               <h3 className="text-sm font-medium text-gray-300 mb-2">Top Passwords</h3>
               <DataTable
                  data={popularPasswords}
                  columns={[
                    { key: "pass", header: "Password" },
                    { key: "count", header: "Attempts" }
                  ]}
                  isLoading={isLoading}
               />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-[#2a2a27] border-white/[0.05] shadow-lg">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-lg font-semibold text-white">Attacker Commands</h2>
            <p className="text-xs text-gray-400">Commands executed after successful login</p>
          </div>
          <div className="p-5">
            <DataTable
              data={recentCommands}
              columns={[
                { key: "ip", header: "IP", width: "120px" },
                { key: "command", header: "Command", render: (row: any) => <code className="text-xs text-green-400">{row.command}</code> },
                { key: "timestamp", header: "Time", render: (row: any) => new Date(row.timestamp).toLocaleTimeString() }
              ]}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        <div className="rounded-xl border bg-[#2a2a27] border-white/[0.05] shadow-lg">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-lg font-semibold text-white">Successful Logins</h2>
            <p className="text-xs text-gray-400">Attackers who gained shell access</p>
          </div>
          <div className="p-5">
            <DataTable
              data={recentLogins}
              columns={[
                { key: "ip", header: "IP" },
                { key: "credentials", header: "Creds", render: (row: any) => `${row.username}/${row.password}` },
                { key: "timestamp", header: "Time", render: (row: any) => new Date(row.timestamp).toLocaleTimeString() }
              ]}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
