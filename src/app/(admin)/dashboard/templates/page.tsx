"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import TemplatesTable from "@/components/templates/TemplatesTable";
import TemplateFilterBar, {
  StatusFilterValue,
  CategoryFilterValue,
} from "@/components/templates/TemplateFilterBar";
import TemplateUploadModal from "@/components/templates/TemplateUploadModal";
import { AutomationTemplate } from "@/lib/templates";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilterValue>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitial, setModalInitial] =
    useState<AutomationTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/templates");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to load templates (${res.status})`);
      }
      const data = (await res.json()) as AutomationTemplate[];
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const statusOk =
        statusFilter === "all" || t.status === statusFilter;
      const categoryOk =
        categoryFilter === "all" || t.category === categoryFilter;
      return statusOk && categoryOk;
    });
  }, [templates, statusFilter, categoryFilter]);

  function handleToggled(updated: AutomationTemplate) {
    setTemplates((list) =>
      list.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  function handleDeleted(id: string) {
    setTemplates((list) => list.filter((t) => t.id !== id));
  }

  function handleEdit(template: AutomationTemplate) {
    setModalMode("edit");
    setModalInitial(template);
    setModalOpen(true);
  }

  function handleOpenUpload() {
    setModalMode("create");
    setModalInitial(null);
    setModalOpen(true);
  }

  function handleSaved(saved: AutomationTemplate) {
    setTemplates((list) => {
      const idx = list.findIndex((t) => t.id === saved.id);
      if (idx === -1) return [saved, ...list];
      const next = list.slice();
      next[idx] = saved;
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Automation Templates</h1>
        <button
          onClick={handleOpenUpload}
          className="rounded-lg bg-[#00e59e]/15 border border-[#00e59e]/30 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors"
        >
          + Upload Template
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTemplates} />
      ) : (
        <TemplatesTable
          templates={filteredTemplates}
          onToggled={handleToggled}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
          filterSlot={
            <TemplateFilterBar
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          }
        />
      )}

      <TemplateUploadModal
        isOpen={modalOpen}
        mode={modalMode}
        initial={modalInitial}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
