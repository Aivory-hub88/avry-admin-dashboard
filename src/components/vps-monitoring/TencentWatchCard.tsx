"use client";
import React, { useState, useEffect, useCallback } from "react";
import { bffFetch, BASE_PATH } from "@/lib/bff";

export interface TencentWatchStatus {
  ts: string;
  auditd_rules: number;
  agents: {
    tat_agent: number;
    sgagent: number;
    barad_agent: number;
    ydservice: number;
    ydlive: number;
  };
  last_run: {
    crit_hits: number;
    canary_hits: number;
    tat_children: number;
    egress_tat_delta_b: number;
    egress_yd_delta_b: number;
    egress_tat_total_b: number;
    egress_yd_total_b: number;
  };
  known_dests: string[];
  log_tail: string[];
}

function formatBytes(b: number): string {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} GB`;
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b > 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

type CardStatus = "normal" | "warning" | "critical";

function deriveStatus(s: TencentWatchStatus | null): { status: CardStatus; label: string } {
  if (!s) return { status: "normal", label: "Loading…" };
  if (s.last_run.crit_hits > 0 || s.last_run.canary_hits > 0) {
    return { status: "critical", label: "CRITICAL — Aivory files touched" };
  }
  if (s.last_run.tat_children > 0) {
    return { status: "warning", label: "Remote shell session active" };
  }
  return { status: "normal", label: "Quiet — no anomalies" };
}

const statusColors: Record<CardStatus, { border: string; text: string; bg: string }> = {
  normal: { bg: "rgba(183, 203, 166, 0.08)", border: "rgba(183, 203, 166, 0.3)", text: "#b7cba6" },
  warning: { bg: "rgba(245, 166, 35, 0.08)", border: "rgba(245, 166, 35, 0.3)", text: "#f5a623" },
  critical: { bg: "rgba(240, 68, 56, 0.08)", border: "rgba(240, 68, 56, 0.3)", text: "#f04438" },
};

export function TencentWatchCard() {
  const [data, setData] = useState<TencentWatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await bffFetch(`${BASE_PATH}/api/admin/vps-monitoring?type=tencent-watch`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const { status, label } = deriveStatus(data);
  const colors = statusColors[status];

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#2a2a27", borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#a3a3a0" }}>
          Tencent Watch
        </p>
        <span
          className="text-xs font-bold px-2 py-1 rounded-lg"
          style={{ background: colors.bg, color: colors.text }}
        >
          {error ? "UNAVAILABLE" : label}
        </span>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "#f5a623" }}>
          ⚠️ {error} — agent snapshot unreachable (vps-panel route or mount missing?).
        </p>
      ) : !data ? (
        <div className="animate-pulse">
          <div className="h-4 w-2/3 rounded mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-4 w-1/2 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs" style={{ color: "#6b6b68" }}>Agents (tat/sg/barad/yd)</p>
            <p className="text-lg font-bold" style={{ color: "#f7f7f7" }}>
              {data.agents.tat_agent}/{data.agents.sgagent}/{data.agents.barad_agent}/
              {data.agents.ydservice + data.agents.ydlive}
            </p>
            <p className="text-xs" style={{ color: "#6b6b68" }}>auditd rules: {data.auditd_rules}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#6b6b68" }}>Crit / Canary hits</p>
            <p
              className="text-lg font-bold"
              style={{
                color:
                  data.last_run.crit_hits + data.last_run.canary_hits > 0
                    ? "#f04438"
                    : "#b7cba6",
              }}
            >
              {data.last_run.crit_hits} / {data.last_run.canary_hits}
            </p>
            <p className="text-xs" style={{ color: "#6b6b68" }}>last 5-min run</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#6b6b68" }}>Remote-shell children</p>
            <p
              className="text-lg font-bold"
              style={{ color: data.last_run.tat_children > 0 ? "#f5a623" : "#b7cba6" }}
            >
              {data.last_run.tat_children}
            </p>
            <p className="text-xs" style={{ color: "#6b6b68" }}>under tat/sgagent</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#6b6b68" }}>Egress TAT / YD (5m)</p>
            <p className="text-lg font-bold" style={{ color: "#f7f7f7" }}>
              {formatBytes(data.last_run.egress_tat_delta_b)} /{" "}
              {formatBytes(data.last_run.egress_yd_delta_b)}
            </p>
            <p className="text-xs" style={{ color: "#6b6b68" }}>
              total {formatBytes(data.last_run.egress_tat_total_b)} /{" "}
              {formatBytes(data.last_run.egress_yd_total_b)}
            </p>
          </div>
        </div>
      )}

      {data && data.known_dests.length > 0 && (
        <p className="text-xs mt-3" style={{ color: "#6b6b68" }}>
          Dests: {data.known_dests.join(", ")} • snapshot {data.ts}
        </p>
      )}
    </div>
  );
}
