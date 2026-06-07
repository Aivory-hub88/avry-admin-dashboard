"use client";
import React from "react";
import DataTable, { Column } from "@/components/shared/DataTable";

interface VisitorsTopPageRow extends Record<string, unknown> {
  page: string;
  count: number;
}

interface VisitorsTopPagesTableProps {
  rows: VisitorsTopPageRow[];
}

export default function VisitorsTopPagesTable({
  rows,
}: VisitorsTopPagesTableProps) {
  // Rows arrive already sorted by count desc from the aggregate endpoint,
  // but sort again defensively to satisfy Req 16.7.
  const sorted = [...rows].sort((a, b) => b.count - a.count);

  const columns: Column<VisitorsTopPageRow>[] = [
    { key: "page", header: "Page" },
    {
      key: "count",
      header: "Visits",
      width: "120px",
      render: (row) => row.count.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
        Top Pages
      </h3>
      <DataTable
        columns={columns}
        data={sorted}
        emptyMessage="No visits yet."
      />
    </div>
  );
}
