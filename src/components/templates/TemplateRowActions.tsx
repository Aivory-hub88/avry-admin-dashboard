"use client";
import React, { useState } from "react";
import WriteGate from "@/components/rbac/WriteGate";
import { AutomationTemplate } from "@/lib/templates";

interface TemplateRowActionsProps {
  template: AutomationTemplate;
  onToggled: (updated: AutomationTemplate) => void;
  onEdit: (template: AutomationTemplate) => void;
  onDeleted: (id: string) => void;
}

export default function TemplateRowActions({
  template,
  onToggled,
  onEdit,
  onDeleted,
}: TemplateRowActionsProps) {
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = template.status === "published" ? "draft" : "published";

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy("toggle");
    setError(null);
    try {
      const res = await fetch(`/admin/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }
      const updated = (await res.json()) as AutomationTemplate;
      onToggled(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/admin/api/admin/templates/${template.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }
      onDeleted(template.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleToggle}
          disabled={busy !== null}
          className="rounded-lg border border-white/[0.07] bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-white/10 disabled:opacity-40 transition-colors"
          title={`Toggle to ${nextStatus}`}
        >
          {busy === "toggle"
            ? "..."
            : template.status === "published"
              ? "Unpublish"
              : "Publish"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(template);
          }}
          className="rounded-lg border border-white/[0.07] bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors"
        >
          Edit
        </button>
        <WriteGate>
          <button
            onClick={handleDelete}
            disabled={busy !== null}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
          >
            {busy === "delete" ? "..." : "Delete"}
          </button>
        </WriteGate>
      </div>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
