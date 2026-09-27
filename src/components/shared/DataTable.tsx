"use client";
import React, { useState } from "react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  /** Make this column's header clickable to sort. */
  sortable?: boolean;
  /**
   * Sort key sent to the server when sorting is server-driven. Defaults to
   * `key` — set it when the API names the field differently from the column.
   */
  sortKey?: string;
}

export type SortDirection = "asc" | "desc";

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filterSlot?: React.ReactNode;
  /** Rendered on the right of the toolbar — e.g. an export button. */
  actionSlot?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;

  /**
   * Sorting. Omit `sort`/`onSortChange` and the table sorts its own `data`
   * client-side; supply them and the parent owns sorting (server-side), which is
   * what large tables need so they can sort across pages rather than within one.
   */
  sort?: { by: string; dir: SortDirection };
  onSortChange?: (by: string, dir: SortDirection) => void;

  /**
   * Server-driven paging. Supply these and the table stops slicing `data` and
   * simply renders the page it was given.
   */
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  pageSize = 20,
  searchPlaceholder,
  onSearch,
  filterSlot,
  actionSlot,
  isLoading,
  emptyMessage = "No data found.",
  sort,
  onSortChange,
  page: controlledPage,
  totalPages: controlledTotalPages,
  totalCount,
  onPageChange,
}: DataTableProps<T>) {
  const [localPage, setLocalPage] = useState(1);
  const [localSort, setLocalSort] = useState<{ by: string; dir: SortDirection } | null>(null);

  const serverPaged = controlledPage !== undefined && onPageChange !== undefined;
  const serverSorted = sort !== undefined && onSortChange !== undefined;

  const page = serverPaged ? controlledPage! : localPage;
  const activeSort = serverSorted ? sort! : localSort;

  // Only sort here when the parent isn't doing it: sorting a single server page
  // locally would reorder 20 rows and look like it had sorted the whole table.
  const sorted = React.useMemo(() => {
    if (serverSorted || !localSort) return data;
    const { by, dir } = localSort;
    return [...data].sort((a, b) => {
      const av = a[by as keyof T];
      const bv = b[by as keyof T];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return dir === "asc" ? cmp : -cmp;
    });
  }, [data, localSort, serverSorted]);

  const totalPages = serverPaged
    ? Math.max(1, controlledTotalPages ?? 1)
    : Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = serverPaged ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);
  const total = totalCount ?? sorted.length;

  const setPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next));
    if (serverPaged) onPageChange!(clamped);
    else setLocalPage(clamped);
  };

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    const key = col.sortKey ?? String(col.key);
    const dir: SortDirection =
      activeSort?.by === key && activeSort.dir === "desc" ? "asc" : "desc";
    if (serverSorted) onSortChange!(key, dir);
    else setLocalSort({ by: key, dir });
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#2a2a27] overflow-hidden">
      {(searchPlaceholder || filterSlot || actionSlot) && (
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/[0.07]">
          {searchPlaceholder && onSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/50"
            />
          )}
          {filterSlot}
          {actionSlot && <div className="ml-auto flex items-center gap-2">{actionSlot}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {columns.map((col) => {
                const key = col.sortKey ?? String(col.key);
                const active = activeSort?.by === key;
                return (
                  <th
                    key={String(col.key)}
                    onClick={() => toggleSort(col)}
                    aria-sort={
                      active ? (activeSort!.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      col.sortable
                        ? "cursor-pointer select-none text-gray-300 hover:text-white"
                        : "text-gray-400"
                    }`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span
                          aria-hidden
                          className={active ? "text-[#b7cba6]" : "text-gray-600"}
                        >
                          {active ? (activeSort!.dir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
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
            Page {page} of {totalPages} ({total.toLocaleString()} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || isLoading}
              className="rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40 hover:bg-white/5"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || isLoading}
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
