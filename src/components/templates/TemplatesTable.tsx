"use client";
import React from "react";
import DataTable, { Column } from "@/components/shared/DataTable";
import { AutomationTemplate } from "@/lib/templates";
import TemplateRowActions from "./TemplateRowActions";

interface TemplatesTableProps {
  templates: AutomationTemplate[];
  onToggled: (updated: AutomationTemplate) => void;
  onEdit: (template: AutomationTemplate) => void;
  onDeleted: (id: string) => void;
  filterSlot?: React.ReactNode;
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function renderTags(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return "—";
  return tags.join(", ");
}

function statusBadge(status: AutomationTemplate["status"]) {
  const label = status === "active" ? "Published" : "Draft";
  const classes =
    status === "active"
      ? "bg-[#00e59e]/20 text-[#00e59e]"
      : "bg-white/10 text-gray-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

export default function TemplatesTable({
  templates,
  onToggled,
  onEdit,
  onDeleted,
  filterSlot,
}: TemplatesTableProps) {
  // DataTable expects rows typed as Record<string, unknown>. We cast through
  // a local index-signature type to keep the column signatures clean.
  type Row = AutomationTemplate & Record<string, unknown>;
  const rows = templates as Row[];

  const columns: Column<Row>[] = [
    { key: "name", header: "Name" },
    { key: "category", header: "Category", width: "140px" },
    {
      key: "tags",
      header: "Tags",
      render: (row) => renderTags(row.tags),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (row) => statusBadge(row.status),
    },
    {
      key: "created_by",
      header: "Created By",
      width: "140px",
      render: (row) => (row.created_by ? String(row.created_by).slice(0, 8) : "—"),
    },
    {
      key: "created_at",
      header: "Created At",
      width: "160px",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      width: "200px",
      render: (row) => (
        <TemplateRowActions
          template={row}
          onToggled={onToggled}
          onEdit={onEdit}
          onDeleted={onDeleted}
        />
      ),
    },
  ];

  return (
    <DataTable<Row>
      columns={columns}
      data={rows}
      filterSlot={filterSlot}
      emptyMessage="No templates match the current filters."
    />
  );
}
