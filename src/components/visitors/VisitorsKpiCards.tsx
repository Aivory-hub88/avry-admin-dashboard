"use client";
import React from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { VisitRange, VisitorAggregate } from "@/lib/aggregateVisits";

interface VisitorsKpiCardsProps {
  aggregate: VisitorAggregate;
  range: VisitRange;
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
}

function pickTotal(aggregate: VisitorAggregate, range: VisitRange): number {
  if (!aggregate?.totals) return 0;
  if (range === "7d") return aggregate.totals.last7Days ?? 0;
  if (range === "30d") return aggregate.totals.last30Days ?? 0;
  return aggregate.totals.allTime ?? 0;
}

/**
 * A small KPI variant that renders a string value (e.g. "/contact") without
 * pushing it through KpiCard's numeric formatter.
 */
function StringKpi({
  title,
  value,
  isLoading,
}: {
  title: string;
  value: string;
  isLoading: boolean;
}) {
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
          className="h-8 w-3/4 rounded"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
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
      <p
        className="text-2xl font-semibold truncate"
        style={{ color: "#f7f7f7" }}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export default function VisitorsKpiCards({
  aggregate,
  range,
  isLoading,
  error,
  onRetry,
}: VisitorsKpiCardsProps) {
  const totalVisits = pickTotal(aggregate, range);
  const mostVisitedPage = aggregate?.byPage?.[0]?.page ?? "—";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total Visits"
        value={totalVisits}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />
      <KpiCard
        title="Unique Countries"
        value={aggregate?.uniqueCountries ?? 0}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />
      <StringKpi
        title="Most Visited Page"
        value={mostVisitedPage}
        isLoading={isLoading}
      />
      <KpiCard
        title="Today's Visits"
        value={aggregate?.totals?.today ?? 0}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />
    </div>
  );
}
