"use client";
import React from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import { flagEmoji } from "@/lib/flagEmoji";

interface VisitorsByCountryRow extends Record<string, unknown> {
  country_code: string | null;
  country_name: string | null;
  count: number;
  percentage: number;
}

interface VisitorsByCountryTableProps {
  rows: VisitorsByCountryRow[];
}

export default function VisitorsByCountryTable({
  rows,
}: VisitorsByCountryTableProps) {
  const columns: Column<VisitorsByCountryRow>[] = [
    {
      key: "country",
      header: "Country",
      render: (row) => {
        if (!row.country_code) return <span>Unknown</span>;
        const flag = flagEmoji(row.country_code);
        const label = row.country_name ?? row.country_code;
        return (
          <span>
            {flag ? `${flag} ${label}` : label}
          </span>
        );
      },
    },
    {
      key: "count",
      header: "Visits",
      width: "120px",
      render: (row) => row.count.toLocaleString(),
    },
    {
      key: "percentage",
      header: "% of total",
      width: "120px",
      render: (row) => `${row.percentage.toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
        Visits by Country
      </h3>
      <DataTable
        columns={columns}
        data={rows}
        emptyMessage="No visits yet."
      />
    </div>
  );
}
