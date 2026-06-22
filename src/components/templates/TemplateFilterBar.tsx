"use client";
import React from "react";
import { TEMPLATE_CATEGORIES } from "@/lib/templates";

export type StatusFilterValue = "all" | "published" | "draft";
export type CategoryFilterValue = "all" | (typeof TEMPLATE_CATEGORIES)[number];

interface TemplateFilterBarProps {
  statusFilter: StatusFilterValue;
  onStatusChange: (value: StatusFilterValue) => void;
  categoryFilter: CategoryFilterValue;
  onCategoryChange: (value: CategoryFilterValue) => void;
}

export default function TemplateFilterBar({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
}: TemplateFilterBarProps) {
  return (
    <>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as StatusFilterValue)}
        className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
        aria-label="Filter by status"
      >
        <option value="all">All Statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <select
        value={categoryFilter}
        onChange={(e) =>
          onCategoryChange(e.target.value as CategoryFilterValue)
        }
        className="rounded-lg border border-white/[0.07] bg-[#2a2a27] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
        aria-label="Filter by category"
      >
        <option value="all">All Categories</option>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </>
  );
}
