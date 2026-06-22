"use client";
import React, { useState } from "react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filterSlot?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  pageSize = 20,
  searchPlaceholder,
  onSearch,
  filterSlot,
  isLoading,
  emptyMessage = "No data found.",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] overflow-hidden">
      {(searchPlaceholder || filterSlot) && (
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/[0.07]">
          {searchPlaceholder && onSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
            />
          )}
          {filterSlot}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-white/[0.04] transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-gray-200">
                      {col.render
                        ? col.render(row)
                        : String(row[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07]">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} ({data.length} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40 hover:bg-white/5"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40 hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
