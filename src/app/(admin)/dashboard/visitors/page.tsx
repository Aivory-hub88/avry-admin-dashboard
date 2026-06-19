"use client";
import React, { useState, useEffect, useCallback } from "react";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import VisitorsKpiCards from "@/components/visitors/VisitorsKpiCards";
import VisitorsTimeRangeFilter from "@/components/visitors/VisitorsTimeRangeFilter";
import VisitorsByCountryTable from "@/components/visitors/VisitorsByCountryTable";
import VisitorsTopPagesTable from "@/components/visitors/VisitorsTopPagesTable";
import { VisitorsByCountryChart } from "@/components/dashboard/VisitorsByCountryChart";
import { VisitorsDailyChart } from "@/components/dashboard/VisitorsDailyChart";
import { VisitorAggregate, VisitRange } from "@/lib/aggregateVisits";

export default function VisitorsPage() {
  const [aggregate, setAggregate] = useState<VisitorAggregate | null>(null);
  const [range, setRange] = useState<VisitRange>("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAggregate = useCallback(async (r: VisitRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/admin/api/admin/visitors?range=${r}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/signin";
          return;
        }
        throw new Error(`Failed to load visitors (${res.status})`);
      }
      const data = (await res.json()) as VisitorAggregate;
      setAggregate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visitors");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAggregate(range);
  }, [range, fetchAggregate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Visitor Tracker</h1>
        <VisitorsTimeRangeFilter value={range} onChange={setRange} />
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => fetchAggregate(range)}
        />
      ) : isLoading || !aggregate ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={1} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LoadingSkeleton rows={6} />
            <LoadingSkeleton rows={6} />
          </div>
          <LoadingSkeleton rows={6} />
        </>
      ) : (
        <>
          <VisitorsKpiCards
            aggregate={aggregate}
            range={range}
            isLoading={false}
            onRetry={() => fetchAggregate(range)}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <VisitorsByCountryChart data={aggregate.byCountry} />
            <VisitorsDailyChart data={aggregate.daily} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <VisitorsByCountryTable rows={aggregate.byCountry} />
            <VisitorsTopPagesTable rows={aggregate.byPage} />
          </div>
        </>
      )}
    </div>
  );
}
