"use client";
import React from "react";
import { VisitRange } from "@/lib/aggregateVisits";

interface VisitorsTimeRangeFilterProps {
  value: VisitRange;
  onChange: (next: VisitRange) => void;
}

const OPTIONS: Array<{ value: VisitRange; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export default function VisitorsTimeRangeFilter({
  value,
  onChange,
}: VisitorsTimeRangeFilterProps) {
  return (
    <div
      className="inline-flex rounded-lg border p-0.5"
      style={{
        background: "#2a2a27",
        borderColor: "rgba(255,255,255,0.07)",
      }}
      role="group"
      aria-label="Visitor time range"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              active
                ? "bg-[#b7cba6]/15 text-[#b7cba6]"
                : "text-gray-300 hover:bg-white/5"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
