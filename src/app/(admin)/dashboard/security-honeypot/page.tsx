"use client";
import React, { useState, useEffect, useCallback } from "react";
import { bffFetch } from "@/lib/bff";
import { KpiCard } from "@/components/dashboard/KpiCard";
import DataTable, { Column } from "@/components/shared/DataTable";
import ErrorState from "@/components/shared/ErrorState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

// Shapes of GET /api/admin/honeypot (tarpit + cowrie stats) and
// GET /api/admin/trap-hits, as this page reads them.
type TarpitConnection = {
  ip: string;
  duration: number;
  bytes: number;
  start: string;
};
type CowrieLogin = {
  ip: string;
  username: string;
  password: string;
  timestamp: string;
};
type CowrieCommand = {
  ip: string;
  command: string;
  timestamp: string;
};
type HoneypotStats = {
  timestamp?: string;
  tarpit?: {
    total_connections?: number;
    total_time_wasted?: number;
    recent_connections?: TarpitConnection[];
  };
  cowrie?: {
    login_attempts?: number;
    popular_usernames?: [string, number][];
    popular_passwords?: [string, number][];
    recent_logins?: CowrieLogin[];
    commands?: CowrieCommand[];
  };
};
type TrapHit = {
  hit_id?: string | number;
  ip: string;
  user_agent: string;
  path: string;
  created_at: string;
};

export default function SecurityHoneypotPage() {
  const [data, setData] = useState<HoneypotStats | null>(null);
  const [trapHits, setTrapHits] = useState<TrapHit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      // bffFetch prepends the "/admin" basePath — a bare fetch("/api/...")
      // leaves this container entirely (Traefik routes /api to the user
      // dashboard) and returns HTML instead of stats.
      const res = await bffFetch("/api/admin/honeypot");
      if (!res.ok) {
        throw new Error("Failed to fetch honeypot stats");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTrapHits = useCallback(async () => {
    try {
      const res = await bffFetch("/api/admin/trap-hits");
      if (!res.ok) return;
      const json = await res.json();
      setTrapHits(json.hits || []);
    } catch {
      // Non-critical panel — leave it empty on failure rather than blocking the page.
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTrapHits();
    const interval = setInterval(() => {
      fetchStats();
      fetchTrapHits();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchTrapHits]);

  if (isLoading && !data) {
    return <LoadingSkeleton />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={fetchStats} />;
  }

  const { tarpit, cowrie } = data ?? {};

  const recentTarpitConnections = tarpit?.recent_connections || [];
  const popularUsernames = cowrie?.popular_usernames?.map(([user, count], i) => ({ id: i, user, count })) || [];
  const popularPasswords = cowrie?.popular_passwords?.map(([pass, count], i) => ({ id: i, pass, count })) || [];
  const recentLogins = cowrie?.recent_logins?.map((l, i) => ({ ...l, id: i })) || [];
  const recentCommands = cowrie?.commands?.map((c, i) => ({ ...c, id: i })) || [];

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
                { key: "duration", header: "Wasted (s)", render: (row: TarpitConnection) => `${row.duration}s` },
                { key: "bytes", header: "Bytes Sent" },
                { key: "start", header: "Time", render: (row: TarpitConnection) => new Date(row.start).toLocaleTimeString() }
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
                { key: "command", header: "Command", render: (row: CowrieCommand) => <code className="text-xs text-green-400">{row.command}</code> },
                { key: "timestamp", header: "Time", render: (row: CowrieCommand) => new Date(row.timestamp).toLocaleTimeString() }
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
                { key: "credentials", header: "Creds", render: (row: CowrieLogin) => `${row.username}/${row.password}` },
                { key: "timestamp", header: "Time", render: (row: CowrieLogin) => new Date(row.timestamp).toLocaleTimeString() }
              ]}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-[#2a2a27] border-white/[0.05] shadow-lg">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-lg font-semibold text-white">Scraper Trap Hits</h2>
          <p className="text-xs text-gray-400">Hits on the hidden canary links (AiTrap / CanaryLink) on the public site</p>
        </div>
        <div className="p-5">
          <DataTable
            data={trapHits.map((h, i) => ({ ...h, id: h.hit_id || i }))}
            columns={[
              { key: "ip", header: "IP" },
              { key: "user_agent", header: "User-Agent" },
              { key: "path", header: "Path" },
              { key: "created_at", header: "Time", render: (row: TrapHit) => new Date(row.created_at).toLocaleString() },
            ]}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
