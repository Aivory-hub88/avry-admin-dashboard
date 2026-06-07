"use client";
import React from "react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CreditUsageChartProps {
  series: Array<{ date: string; credits: number }>;
}

export function CreditUsageChart({ series }: CreditUsageChartProps) {
  const chartData = series.map((item) => ({
    x: new Date(item.date).getTime(),
    y: item.credits,
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
      },
    },
    grid: {
      borderColor: "rgba(255,255,255,0.07)",
      strokeDashArray: 4,
    },
    tooltip: {
      theme: "dark",
      x: { format: "dd MMM yyyy" },
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
        Credit Usage (Last 30 Days)
      </h3>
      <ReactApexChart
        type="line"
        options={options}
        series={[{ name: "Credits", data: chartData }]}
        height={200}
      />
    </div>
  );
}
