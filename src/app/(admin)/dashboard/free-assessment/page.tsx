"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { bffFetch } from "@/lib/bff";
import DataTable, { Column } from "@/components/shared/DataTable";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";

/**
 * Free assessment funnel and captured leads.
 *
 * Two data sources, deliberately kept apart on screen. The funnel comes from
 * assessment_events, which is anonymous and best-effort — beacons can be
 * blocked. The leads come from assessment_leads, which is the record sales
 * works from. When the two disagree, the lead table is the one to trust.
 */

interface Lead extends Record<string, unknown> {
  id: string;
  email: string;
  company_name: string | null;
  industry: string | null;
  company_size: string | null;
  score: number | null;
  maturity: string | null;
  source: string | null;
  created_at: string | null;
}

interface FunnelSummary {
  starts: number;
  completions: number;
  leads: number;
  lead_events: number;
  completion_rate: number;
  lead_rate: number;
}

interface FunnelStep {
  step: number;
  reached: number;
}

interface DailyPoint {
  day: string;
  starts: number;
  completions: number;
  leads: number;
}

interface StatsPayload {
  days: number;
  summary: FunnelSummary;
  steps: FunnelStep[];
  daily: DailyPoint[];
}

interface ApiPayload {
  stats: StatsPayload | null;
  statsError: string | null;
  leads: { leads: Lead[]; total: number } | null;
  leadsError: string | null;
}

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const CARD = "rounded-xl border border-white/[0.07] bg-[#2a2a27] p-4";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Escapes one CSV field. Excel treats a leading =, +, - or @ as a formula, and
 * these values come from a public form — quoting alone would not stop it.
 */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function FreeAssessmentPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bffFetch(`/api/admin/free-assessment?days=${range}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData((await res.json()) as ApiPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load free assessment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const leads = useMemo(() => data?.leads?.leads ?? [], [data]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.email, l.company_name, l.industry, l.maturity]
        .some((field) => (field ?? "").toString().toLowerCase().includes(q)),
    );
  }, [leads, search]);

  const exportCsv = useCallback(() => {
    const headers = ["Email", "Company", "Industry", "Company size", "Score", "Maturity", "Source", "Captured"];
    const rows = filteredLeads.map((l) => [
      l.email, l.company_name, l.industry, l.company_size, l.score, l.maturity, l.source, l.created_at,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    // ﻿ so Excel opens it as UTF-8 rather than mangling accented names.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `free-assessment-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLeads]);

  const columns: Column<Lead>[] = [
    { key: "email", header: "Email" },
    { key: "company_name", header: "Company", render: (r) => r.company_name || "—" },
    { key: "industry", header: "Industry", render: (r) => r.industry || "—" },
    { key: "company_size", header: "Size", render: (r) => r.company_size || "—" },
    {
      key: "score",
      header: "Score",
      render: (r) =>
        r.score === null ? "—" : <span className="font-semibold text-[#b7cba6]">{r.score}</span>,
    },
    { key: "maturity", header: "Maturity", render: (r) => r.maturity || "—" },
    { key: "created_at", header: "Captured", render: (r) => formatDate(r.created_at) },
  ];

  if (loading && !data) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => load(days)} />;

  const summary = data?.stats?.summary;
  const steps = data?.stats?.steps ?? [];
  const daily = data?.stats?.daily ?? [];
  const peakStep = steps.reduce((max, s) => Math.max(max, s.reached), 0);
  const peakDay = daily.reduce((max, d) => Math.max(max, d.starts, d.completions, d.leads), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Free Assessment</h1>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                days === r.value
                  ? "border-[#b7cba6]/50 bg-[#b7cba6]/15 text-[#b7cba6]"
                  : "border-white/[0.07] bg-[#2a2a27] text-gray-300 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data?.statsError && (
        <div className={`${CARD} text-sm text-yellow-400`}>
          Funnel statistics unavailable: {data.statsError}. The lead list below is unaffected.
        </div>
      )}

      {/* Funnel headline */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Started", value: summary?.starts ?? 0, color: "text-white" },
          { label: "Completed", value: summary?.completions ?? 0, color: "text-white" },
          { label: "Emails captured", value: summary?.leads ?? 0, color: "text-[#b7cba6]" },
          {
            label: "Start → email",
            value: summary ? `${summary.lead_rate}%` : "—",
            color: "text-[#b7cba6]",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={CARD}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
              {kpi.label}
            </p>
            <p className={`text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Per-question drop-off */}
      <div className={CARD}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-white">Where people stop</h2>
          <span className="text-xs text-gray-400">
            unique visitors reaching each question, last {days} days
          </span>
        </div>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-400">
            No funnel events recorded yet in this window.
          </p>
        ) : (
          <div className="space-y-1.5">
            {steps.map((s) => {
              const pct = peakStep ? Math.round((s.reached / peakStep) * 100) : 0;
              return (
                <div key={s.step} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-gray-400">Q{s.step}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-white/[0.04]">
                    <div
                      className="h-full rounded bg-[#b7cba6]/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-gray-300">
                    {s.reached}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily trend */}
      <div className={CARD}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-white">Daily trend</h2>
          <span className="text-xs text-gray-400">
            <span className="text-gray-300">starts</span> ·{" "}
            <span className="text-[#b7cba6]">emails</span>
          </span>
        </div>
        {peakDay === 0 ? (
          <p className="text-sm text-gray-400">Nothing recorded in this window yet.</p>
        ) : (
          <div className="flex h-24 items-end gap-[2px] overflow-x-auto">
            {daily.map((d) => (
              <div
                key={d.day}
                className="flex min-w-[6px] flex-1 flex-col justify-end gap-[1px]"
                title={`${d.day}: ${d.starts} started, ${d.completions} completed, ${d.leads} emails`}
              >
                <div
                  className="w-full rounded-t bg-white/20"
                  style={{ height: `${(d.starts / peakDay) * 100}%` }}
                />
                <div
                  className="w-full rounded-t bg-[#b7cba6]/70"
                  style={{ height: `${(d.leads / peakDay) * 100}%` }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">
          Captured leads{" "}
          <span className="font-normal text-gray-400">
            ({filteredLeads.length}
            {data?.leads?.total !== undefined && filteredLeads.length !== data.leads.total
              ? ` of ${data.leads.total}`
              : ""}
            )
          </span>
        </h2>
        <button
          onClick={exportCsv}
          disabled={filteredLeads.length === 0}
          className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-1.5 text-sm text-gray-200 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {data?.leadsError ? (
        <ErrorState message={data.leadsError} onRetry={() => load(days)} />
      ) : (
        <DataTable<Lead>
          columns={columns}
          data={filteredLeads}
          pageSize={25}
          isLoading={loading}
          searchPlaceholder="Search email, company, industry…"
          onSearch={setSearch}
          emptyMessage="No leads captured yet."
        />
      )}
    </div>
  );
}
