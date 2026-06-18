"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  AutomationTemplate,
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  TemplateStatus,
  parseTags,
} from "@/lib/templates";

interface TemplateUploadModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initial?: AutomationTemplate | null;
  onClose: () => void;
  onSaved: (saved: AutomationTemplate) => void;
}

interface FormState {
  name: string;
  description: string;
  category: TemplateCategory;
  tagsRaw: string;
  workflowJsonRaw: string;
  status: TemplateStatus;
}

function emptyFormState(): FormState {
  return {
    name: "",
    description: "",
    category: "Automation",
    tagsRaw: "",
    workflowJsonRaw: "",
    status: "draft",
  };
}

function stateFromTemplate(t: AutomationTemplate): FormState {
  return {
    name: t.name ?? "",
    description: t.description ?? "",
    category: (TEMPLATE_CATEGORIES.includes(t.category as TemplateCategory)
      ? (t.category as TemplateCategory)
      : "Custom"),
    tagsRaw: (t.tags ?? []).join(", "),
    workflowJsonRaw: JSON.stringify(t.workflow_json ?? {}, null, 2),
    status: t.status ?? "draft",
  };
}

export default function TemplateUploadModal({
  isOpen,
  mode,
  initial,
  onClose,
  onSaved,
}: TemplateUploadModalProps) {
  const [form, setForm] = useState<FormState>(emptyFormState());
  const [nameError, setNameError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && initial) {
      setForm(stateFromTemplate(initial));
    } else {
      setForm(emptyFormState());
    }
    setNameError(null);
    setJsonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [isOpen, mode, initial]);

  const title = mode === "edit" ? "Edit Template" : "Upload Template";

  function validateJsonOnChange(text: string) {
    if (text.trim() === "") {
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setJsonError("Workflow JSON must be a JSON object");
      } else {
        setJsonError(null);
      }
    } catch (err) {
      setJsonError(
        `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`
      );
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setForm((f) => ({ ...f, workflowJsonRaw: text }));
    validateJsonOnChange(text);
    // Reset the input so the same file can be re-selected
    event.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Name required
    if (form.name.trim() === "") {
      setNameError("Name is required");
      return;
    }
    setNameError(null);

    // Workflow JSON required + must parse to object
    if (form.workflowJsonRaw.trim() === "") {
      setJsonError("Workflow JSON is required");
      return;
    }
    let workflow_json: Record<string, unknown>;
    try {
      const parsed = JSON.parse(form.workflowJsonRaw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setJsonError("Workflow JSON must be a JSON object");
        return;
      }
      workflow_json = parsed as Record<string, unknown>;
    } catch (err) {
      setJsonError(
        `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`
      );
      return;
    }

    const body = {
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      tags: parseTags(form.tagsRaw),
      workflow_json,
      status: form.status,
    };

    setIsSubmitting(true);
    try {
      const url =
        mode === "edit" && initial
          ? `/api/admin/templates/${initial.id}`
          : "/api/admin/templates";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setSubmitError(payload.error ?? `Request failed (${res.status})`);
        return;
      }
      const saved = (await res.json()) as AutomationTemplate;
      onSaved(saved);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[720px] w-full rounded-3xl"
    >
      <div
        className="rounded-3xl border p-6 space-y-5"
        style={{
          background: "var(--color-bg-elevated, #3a3a36)",
          borderColor: "var(--color-border-soft, rgba(255,255,255,0.07))",
          color: "var(--color-text-primary, #f7f7f7)",
          fontFamily: "var(--font-manrope, 'Manrope', Manrope, sans-serif)",
          borderRadius: "var(--radius-card, 18px)",
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              placeholder="e.g. New Lead Welcome Sequence"
            />
            {nameError && (
              <p className="text-xs text-red-400" role="alert">
                {nameError}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              placeholder="What does this template do?"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as TemplateCategory,
                  })
                }
                className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              >
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "draft" })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.status === "draft"
                      ? "border-[#00e59e]/30 bg-[#00e59e]/15 text-[#00e59e]"
                      : "border-white/[0.07] bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "published" })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.status === "published"
                      ? "border-[#00e59e]/30 bg-[#00e59e]/15 text-[#00e59e]"
                      : "border-white/[0.07] bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  Published
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
              Tags <span className="text-gray-500">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tagsRaw}
              onChange={(e) => setForm({ ...form, tagsRaw: e.target.value })}
              className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              placeholder="sales, onboarding, email"
            />
          </div>

          {/* Workflow JSON */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
              Workflow JSON <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/[0.07] bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 transition-colors">
                Upload .json
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-gray-500">
                or paste the JSON body below
              </span>
            </div>
            <textarea
              value={form.workflowJsonRaw}
              onChange={(e) => {
                setForm({ ...form, workflowJsonRaw: e.target.value });
                validateJsonOnChange(e.target.value);
              }}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-white/[0.07] bg-white/5 px-3 py-2.5 font-mono text-xs placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/50"
              placeholder='{"nodes": [...], "connections": {...}}'
            />
            {jsonError && (
              <p className="text-xs text-red-400" role="alert">
                {jsonError}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            {submitError ? (
              <p className="text-xs text-red-400" role="alert">
                {submitError}
              </p>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.07] px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#00e59e]/15 border border-[#00e59e]/30 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? "Saving..."
                  : mode === "edit"
                    ? "Save Changes"
                    : "Create Template"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
