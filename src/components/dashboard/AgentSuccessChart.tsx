"use client";
import React from "react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AgentSuccessChartProps {
  success: number;
  failed: number;
  running: number;
}

export function AgentSuccessChart({ success, failed, running }: AgentSuccessChartProps) {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
    },
    theme: { mode: "dark" },
    colors: ["#00e59e", "#f04438", "#f79009"],
    labels: ["Success", "Failed", "Running"],
    legend: {
      position: "bottom",
      labels: { colors: "#a1a1aa" },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", colors: ["#f7f7f7"] },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              color: "#a1a1aa",
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0
                );
                return total.toLocaleString();
              },
            },
          },
        },
      },
    },
    tooltip: { theme: "dark" },
    stroke: { width: 0 },
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "#2a2a27",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: "#a1a1aa" }}>
        Agent Run Outcomes
      </h3>
      <ReactApexChart
        type="donut"
        options={options}
        series={[success, failed, running]}
        height={260}
      />
    </div>
  );
}
