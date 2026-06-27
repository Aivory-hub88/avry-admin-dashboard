"use client";
import React from "react";

interface ServiceStatus {
  name: string;
  status: "up" | "down" | "unknown";
  latency?: number;
}

interface ServiceHealthTableProps {
  services: ServiceStatus[];
  isLoading?: boolean;
}

export function ServiceHealthTable({ services, isLoading = false }: ServiceHealthTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="h-4 w-1/3 rounded mb-4" style={{ background: "rgba(255,255,255,0.08)" }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 rounded mb-2" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#f7f7f7" }}>
        Service Health
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: "#6b6b68" }}>
              <th className="pb-2 font-medium">Service</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => (
              <tr key={svc.name} className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <td className="py-2.5" style={{ color: "#f7f7f7" }}>
                  {svc.name}
                </td>
                <td className="py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background:
                        svc.status === "up"
                          ? "rgba(183, 203, 166, 0.15)"
                          : svc.status === "down"
                          ? "rgba(240, 68, 56, 0.15)"
                          : "rgba(255,255,255,0.08)",
                      color:
                        svc.status === "up"
                          ? "#b7cba6"
                          : svc.status === "down"
                          ? "#f04438"
                          : "#a3a3a0",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background:
                          svc.status === "up" ? "#b7cba6" : svc.status === "down" ? "#f04438" : "#6b6b68",
                      }}
                    />
                    {svc.status === "up" ? "Healthy" : svc.status === "down" ? "Down" : "Unknown"}
                  </span>
                </td>
                <td className="py-2.5" style={{ color: "#a3a3a0" }}>
                  {svc.latency != null ? `${svc.latency.toFixed(0)}ms` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
