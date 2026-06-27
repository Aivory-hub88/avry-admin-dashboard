"use client";
import React from "react";
import dynamic from "next/dynamic";

// Mirror the dynamic import pattern used by CreditUsageChart / AgentSuccessChart
// exactly (Req 15.3, 15.4, Design §Chart component files).
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface VisitorsByCountryChartProps {
  data: Array<{
    country_code: string | null;
    country_name: string | null;
    count: number;
  }>;
}

export function VisitorsByCountryChart({ data }: VisitorsByCountryChartProps) {
  const top10 = data.slice(0, 10);

  if (top10.length === 0) {
    return (
      <div
        className="rounded-2xl border p-5 flex items-center justify-center"
        style={{
          background: "#2a2a27",
          borderColor: "rgba(255,255,255,0.07)",
          minHeight: 260,
        }}
      >
        <p className="text-sm" style={{ color: "#a1a1aa" }}>
          No visits yet
        </p>
      </div>
    );
  }

  const categories = top10.map(
    (entry) => entry.country_name ?? entry.country_code ?? "Unknown"
  );
  const seriesData = top10.map((entry) => entry.count);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      background: "transparent",
      toolbar: { show: false },
    },
    theme: { mode: "dark" },
    colors: ["#b7cba6"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "60%",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
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
      y: {
        formatter: (val: number) => val.toLocaleString(),
      },
    },
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
        Top Countries by Visits
      </h3>
      <ReactApexChart
        type="bar"
        options={options}
        series={[{ name: "Visits", data: seriesData }]}
        height={Math.max(240, top10.length * 32)}
      />
    </div>
  );
}
