"use client";
import React, { useState } from "react";

interface ExportButtonProps {
  /** BFF route that streams the CSV, e.g. /api/admin/payments/export */
  href: string;
  /** Query params to forward — pass the view's active filters. */
  params?: Record<string, string | number | boolean | undefined | null>;
  label?: string;
  /** Fallback filename if the server sends no Content-Disposition. */
  filename?: string;
  disabled?: boolean;
}

/**
 * Downloads a CSV report from a BFF route.
 *
 * Fetches rather than navigating, for two reasons: the request carries the
 * session cookie/header the same way every other admin call does, and a failure
 * surfaces as a message here instead of replacing the page with a JSON error.
 *
 * The caller passes the current filters so an export always matches the table
 * on screen — a report that silently ignores the active filter is worse than none.
 */
export default function ExportButton({
  href,
  params,
  label = "Export CSV",
  filename = "export.csv",
  disabled,
}: ExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, String(value));
        }
      });
      const url = query.toString() ? `${href}?${query}` : href;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      // Prefer the server's filename: it carries the generation timestamp.
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const name = match?.[1] ?? filename;

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        type="button"
        onClick={download}
        disabled={disabled || busy}
        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          aria-hidden
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {busy ? "Preparing…" : label}
      </button>
    </div>
  );
}
