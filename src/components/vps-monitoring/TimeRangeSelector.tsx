"use client";
import React from "react";

interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
}

const ranges = [
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: selected === range.value ? "rgba(0, 229, 158, 0.15)" : "transparent",
            color: selected === range.value ? "#00e59e" : "#a3a3a0",
          }}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
