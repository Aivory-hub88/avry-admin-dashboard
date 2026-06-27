"use client";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { queryRange, getTimeRange, PrometheusResult } from "@/lib/monitoring";

// Lazy-load ApexCharts (client-only)
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ResourceChartProps {
  title: string;
  query: string;
  timeRange: string;
  userId?: string | null;
  unit?: string;
  formatValue?: (val: number) => string;
  color?: string;
  height?: number;
}

export function ResourceChart({
  title,
  query,
  timeRange,
  userId,
  unit = "",
  formatValue,
  color = "#b7cba6",
  height = 200,
}: ResourceChartProps) {
  const [series, setSeries] = useState<{ name: string; data: [number, number][] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { start, end, step } = getTimeRange(timeRange);
      const res = await queryRange(query, start, end, step, userId || undefined);

      if (res.status !== "success" || !res.data) {
        setError("No data available");
        setSeries([]);
        return;
      }

      const chartSeries = res.data.result.map((r: PrometheusResult) => {
        const label = r.metric.name || r.metric.container_id || r.metric.user_id || r.metric.instance || title;
        const data: [number, number][] = (r.values || []).map(([ts, val]) => [
          ts * 1000, // Convert to milliseconds for ApexCharts
          parseFloat(val) || 0,
        ]);
        return { name: label, data };
      });

      setSeries(chartSeries.length ? chartSeries : [{ name: title, data: [] }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setSeries([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, timeRange, userId, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)", height: height + 60 }}
      >
        <div className="h-4 w-1/3 rounded mb-4" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="rounded" style={{ background: "rgba(255,255,255,0.04)", height }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border p-5 flex flex-col items-center justify-center"
        style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)", minHeight: height + 60 }}
      >
        <p className="text-sm mb-2" style={{ color: "#f7f7f7" }}>{title}</p>
        <p className="text-xs" style={{ color: "#f5a623" }}>{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-3 py-1 text-xs rounded-md border"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a3a3a0" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: false },
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: true, speed: 400 },
    },
    colors: [color, "#f5a623", "#a78bfa", "#38bdf8"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.05, stops: [0, 100] },
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#6b6b68", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#6b6b68", fontSize: "10px" },
        formatter: formatValue || ((val: number) => `${val.toFixed(1)}${unit}`),
      },
    },
    grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 3 },
    tooltip: {
      theme: "dark",
      x: { format: "HH:mm:ss" },
      y: { formatter: formatValue || ((val: number) => `${val.toFixed(2)} ${unit}`) },
    },
    legend: {
      show: series.length > 1,
      labels: { colors: "#a3a3a0" },
      position: "top",
    },
    dataLabels: { enabled: false },
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#2a2a27", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: "#f7f7f7" }}>
        {title}
      </h3>
      <Chart options={options} series={series} type="area" height={height} />
    </div>
  );
}
