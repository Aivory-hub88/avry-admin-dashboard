"use client";
import React from "react";

interface MetricCardProps {
  title: string;
  value: string | null;
  unit?: string;
  subtitle?: string;
  status?: "normal" | "warning" | "critical";
  isLoading?: boolean;
}

const statusColors = {
  normal: { bg: "rgba(0, 229, 158, 0.1)", border: "rgba(0, 229, 158, 0.3)", text: "#00e59e" },
  warning: { bg: "rgba(245, 166, 35, 0.1)", border: "rgba(245, 166, 35, 0.3)", text: "#f5a623" },
  critical: { bg: "rgba(240, 68, 56, 0.1)", border: "rgba(240, 68, 56, 0.3)", text: "#f04438" },
};

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  status = "normal",
  isLoading = false,
}: MetricCardProps) {
  const colors = statusColors[status];

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="h-3 w-1/2 rounded mb-3" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-8 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5 transition-colors"
      style={{ background: "#2a2a27", borderColor: colors.border }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#a3a3a0" }}>
        {title}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold" style={{ color: colors.text }}>
          {value ?? "—"}
        </span>
        {unit && (
          <span className="text-sm" style={{ color: "#a3a3a0" }}>
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs mt-1.5" style={{ color: "#6b6b68" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
