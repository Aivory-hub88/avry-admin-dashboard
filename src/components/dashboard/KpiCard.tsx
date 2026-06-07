"use client";
import React from "react";

interface KpiCardProps {
  title: string;
  value: number | null;
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
}

export function KpiCard({ title, value, isLoading, error, onRetry }: KpiCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{
          background: "#2a2a27",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="h-4 w-2/3 rounded mb-3"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="h-8 w-1/2 rounded"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border p-5 flex flex-col gap-2"
        style={{
          background: "#2a2a27",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
          {title}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "#f04438" }}>
            {error}
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              title="Retry"
              className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-white/10"
              style={{ color: "#00e59e" }}
            >
              {/* Retry icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "#2a2a27",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: "#a1a1aa" }}>
        {title}
      </p>
      <p className="text-3xl font-semibold" style={{ color: "#f7f7f7" }}>
        {value !== null ? value.toLocaleString() : "—"}
      </p>
    </div>
  );
}
