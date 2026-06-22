"use client";
import React from "react";
import dynamic from "next/dynamic";

// Mirror the dynamic import pattern used by CreditUsageChart / AgentSuccessChart
// exactly (Req 15.3, 15.5, Design §Chart component files).
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface VisitorsDailyChartProps {
  data: Array<{ date: string; count: number }>; // always 30 entries
}

export function VisitorsDailyChart({ data }: VisitorsDailyChartProps) {
  const chartData = data.map((entry) => ({
    x: new Date(entry.date).getTime(),
    y: entry.count,
  }));

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    theme: { mode: "dark" },
    colors: ["#00e59e"],
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: "#a1a1aa", fontSize: "12px" },
      },
      axisBorder: { color: "rgba(255,255,255,0.07)" },
      axisTicks: { color: "rgba(255,255,255,0.07)" },
    },
    yaxis: {
      labels: {
        style: { colors: "#a1a1aa", fontSize: "12px" },
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    grid: {
      borderColor: "rgba(255,255,255,0.07)",
      strokeDashArray: 4,
    },
    tooltip: {
      theme: "dark",
      x: { format: "dd MMM yyyy" },
      y: { formatter: (val: number) => val.toLocaleString() },
    },
    dataLabels: { enabled: false },
    markers: { size: 0 },
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
        Daily Visits (Last 30 Days)
      </h3>
      <ReactApexChart
        type="line"
        options={options}
        series={[{ name: "Visits", data: chartData }]}
        height={240}
      />
    </div>
  );
}
