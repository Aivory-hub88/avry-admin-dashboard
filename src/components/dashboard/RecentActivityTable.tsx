"use client";
import React from "react";

interface ActivityEntry {
  id: string;
  type: string;
  userId: string;
  description: string;
  timestamp: string;
}

interface RecentActivityTableProps {
  activities: ActivityEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  workflow_run: "#00e59e",
  workflow_error: "#f04438",
  agent_run: "#60a5fa",
  agent_error: "#f04438",
  user_signup: "#a78bfa",
  user_upgrade: "#34d399",
  credit_purchase: "#f79009",
  integration_connect: "#38bdf8",
  integration_error: "#f04438",
};

function formatType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivityTable({ activities }: RecentActivityTableProps) {
  const rows = activities.slice(0, 20);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "#2a2a27",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <h3 className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
          Recent Activity
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <th
                className="px-5 py-3 text-left font-medium"
                style={{ color: "#a1a1aa" }}
              >
                Type
              </th>
              <th
                className="px-5 py-3 text-left font-medium"
                style={{ color: "#a1a1aa" }}
              >
                User ID
              </th>
              <th
                className="px-5 py-3 text-left font-medium"
                style={{ color: "#a1a1aa" }}
              >
                Description
              </th>
              <th
                className="px-5 py-3 text-left font-medium whitespace-nowrap"
                style={{ color: "#a1a1aa" }}
              >
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((activity, idx) => (
              <tr
                key={activity.id}
                style={{
                  borderBottom:
                    idx < rows.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3 whitespace-nowrap">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      color: TYPE_COLORS[activity.type] ?? "#a1a1aa",
                      background: `${TYPE_COLORS[activity.type] ?? "#a1a1aa"}18`,
                    }}
                  >
                    {formatType(activity.type)}
                  </span>
                </td>
                <td
                  className="px-5 py-3 font-mono text-xs"
                  style={{ color: "#a1a1aa" }}
                >
                  {activity.userId}
                </td>
                <td className="px-5 py-3" style={{ color: "#f7f7f7" }}>
                  {activity.description}
                </td>
                <td
                  className="px-5 py-3 whitespace-nowrap text-xs"
                  style={{ color: "#a1a1aa" }}
                >
                  {formatTimestamp(activity.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
