"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import ErrorState from "@/components/shared/ErrorState";
import ExportButton from "@/components/shared/ExportButton";
import { bffFetch } from "@/lib/bff";

/**
 * USD -> IDR movement.
 *
 * Two series are plotted: the market rate the provider published, and the
 * billing rate customers were actually charged (market + margin). Showing both
 * makes the margin visible instead of implied, and makes any historical charge
 * explainable.
 */

interface FxPoint {
  fetchedAt: string;
  marketRate: number;
  billingRate: number;
  marginPercent: number;
  provider: string;
  providerUpdatedAt: string | null;
}

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

const formatRate = (value: number) =>
  value.toLocaleString("id-ID", { maximumFractionDigits: 0 });

/** One observation row, with the move since the previous observation. */
interface FxRow extends Record<string, unknown> {
  fetchedAt: string;
  marketRate: number;
  billingRate: number;
  marginPercent: number;
  delta: number;
  providerUpdatedAt: string | null;
}

const observationColumns: Column<FxRow>[] = [
  {
    key: "fetchedAt",
    header: "Recorded",
    width: "170px",
    sortable: true,
    render: (row) => (
      <span className="whitespace-nowrap text-gray-300">
        {row.fetchedAt.slice(0, 19).replace("T", " ")}
      </span>
    ),
  },
  {
    key: "marketRate",
    header: "Market",
    width: "130px",
    sortable: true,
    render: (row) => `Rp ${formatRate(row.marketRate)}`,
  },
  {
    key: "billingRate",
    header: "Billed",
    width: "130px",
    sortable: true,
    render: (row) => (
      <span className="font-medium text-[#b7cba6]">Rp {formatRate(row.billingRate)}</span>
    ),
  },
  {
    key: "marginPercent",
    header: "Margin",
    width: "90px",
    sortable: true,
    render: (row) => `${row.marginPercent}%`,
  },
  {
    key: "delta",
    header: "Change",
    width: "110px",
    sortable: true,
    render: (row) =>
      row.delta === 0 ? (
        <span className="text-gray-500">—</span>
      ) : (
        <span className={row.delta > 0 ? "text-yellow-400" : "text-[#b7cba6]"}>
          {row.delta > 0 ? "+" : ""}
          {formatRate(row.delta)}
        </span>
      ),
  },
];

export default function CurrencyPage() {
  const [points, setPoints] = useState<FxPoint[]>([]);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bffFetch(`/api/admin/fx?days=${days}`);
      if (!response.ok) throw new Error(`Failed to load rates (${response.status})`);
      const data = await response.json();
      setPoints(Array.isArray(data.points) ? data.points : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rates");
      setPoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Newest first for the table (the chart wants oldest-first, so it keeps
  // `points` as delivered and the table reverses a copy).
  const rows = useMemo<FxRow[]>(
    () =>
      [...points].reverse().map((p, i, all) => {
        const previous = all[i + 1];
        const delta = previous ? p.marketRate - previous.marketRate : 0;
        return {
          fetchedAt: p.fetchedAt,
          marketRate: p.marketRate,
          billingRate: p.billingRate,
          marginPercent: p.marginPercent,
          delta,
          providerUpdatedAt: p.providerUpdatedAt,
        };
      }),
    [points]
  );

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const market = points.map((p) => p.marketRate);
    const latest = points[points.length - 1];
    const earliest = points[0];
    const change = earliest.marketRate
      ? ((latest.marketRate - earliest.marketRate) / earliest.marketRate) * 100
      : 0;
    return {
      latest,
      min: Math.min(...market),
      max: Math.max(...market),
      change,
      observations: points.length,
    };
  }, [points]);

  if (error && points.length === 0 && !isLoading) {
    return <ErrorState message={error} onRetry={fetchHistory} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Currency</h1>
          <p className="mt-1 text-sm text-gray-400">
            USD to IDR, as published by the rate provider and as charged to customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Date range"
            className="rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value} className="bg-[#2a2a27]">
                {r.label}
              </option>
            ))}
          </select>
          <ExportButton
            href="/admin/api/admin/fx/export"
            params={{ days }}
            label="Export rates"
            disabled={points.length === 0}
          />
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card
            label="Billing rate now"
            value={`Rp ${formatRate(stats.latest.billingRate)}`}
            sub={`market Rp ${formatRate(stats.latest.marketRate)} + ${stats.latest.marginPercent}%`}
            tone="good"
          />
          <Card label="Low" value={`Rp ${formatRate(stats.min)}`} />
          <Card label="High" value={`Rp ${formatRate(stats.max)}`} />
          <Card
            label={`Change over ${days}d`}
            value={`${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}%`}
            tone={stats.change >= 0 ? "warn" : "good"}
            sub={`${stats.observations} observation(s)`}
          />
        </div>
      )}

      <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Loading rates…
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-gray-400">No rate history recorded yet.</p>
            <p className="max-w-md text-xs text-gray-500">
              The payments service records the rate every couple of hours. The first
              points appear shortly after it starts.
            </p>
          </div>
        ) : (
          <RateChart points={points} />
        )}
      </div>

      {points.length > 0 && (
        <>
          <DataTable<FxRow>
            columns={observationColumns}
            data={rows}
            pageSize={15}
            isLoading={isLoading}
            emptyMessage="No observations in this range."
          />

          <p className="text-xs text-gray-500">
            Provider: {points[points.length - 1].provider || "—"}
            {points[points.length - 1].providerUpdatedAt && (
              <>
                {" "}· last published{" "}
                {points[points.length - 1].providerUpdatedAt?.slice(0, 19).replace("T", " ")}
              </>
            )}
            . The provider republishes roughly daily, so consecutive observations can
            repeat the same value — the rate is polled every 2 hours, but it only
            changes when the provider publishes.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Inline SVG line chart.
 *
 * Deliberately dependency-free: the admin dashboard has no charting library, and
 * adding one for two series would be a heavier commitment than the feature needs.
 */
function RateChart({ points }: { points: FxPoint[] }) {
  const width = 900;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 28, left: 64 };

  const values = points.flatMap((p) => [p.marketRate, p.billingRate]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the domain so a flat series doesn't collapse onto one line.
  const span = max - min || Math.max(1, max * 0.01);
  const yMin = min - span * 0.15;
  const yMax = max + span * 0.15;

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const x = (i: number) =>
    padding.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (value: number) =>
    padding.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const path = (key: "marketRate" | "billingRate") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p[key])}`).join(" ");

  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  const labelEvery = Math.max(1, Math.floor(points.length / 6));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px]" role="img"
           aria-label="USD to IDR rate over time">
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.07)"
              strokeDasharray="3 3"
            />
            <text x={padding.left - 8} y={y(t) + 4} textAnchor="end"
                  className="fill-gray-500" fontSize="11">
              {formatRate(t)}
            </text>
          </g>
        ))}

        <path d={path("marketRate")} fill="none" stroke="#6b7280" strokeWidth="1.5" />
        <path d={path("billingRate")} fill="none" stroke="#b7cba6" strokeWidth="2" />

        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle"
                  className="fill-gray-500" fontSize="10">
              {p.fetchedAt.slice(5, 10)}
            </text>
          ) : null
        )}
      </svg>

      <div className="mt-3 flex items-center gap-5 text-xs text-gray-400">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 bg-[#b7cba6]" /> Billing rate (charged)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 bg-gray-500" /> Market rate (provider)
        </span>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn";
}) {
  const accent =
    tone === "good" ? "text-[#b7cba6]" : tone === "warn" ? "text-yellow-400" : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] p-4">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}
