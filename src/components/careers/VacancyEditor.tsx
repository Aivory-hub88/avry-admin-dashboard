"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import RichTextEditor from "./RichTextEditor";
import ScreeningQuestionBuilder, {
  ScreeningQuestion,
} from "./ScreeningQuestionBuilder";

const CAREERS_SERVICE_URL =
  process.env.NEXT_PUBLIC_CAREERS_URL ?? "http://localhost:8090";

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

interface VacancyEditorProps {
  /** If provided, the editor loads in edit mode for this vacancy */
  editingVacancyId?: string | null;
  /** Called after successful save/publish */
  onSaved?: () => void;
  /** Called when user cancels edit mode */
  onCancel?: () => void;
}

interface VacancyFormData {
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string;
  screening_questions: ScreeningQuestion[];
}

const EMPTY_FORM: VacancyFormData = {
  title: "",
  department: "",
  location: "",
  employment_type: "",
  description: "",
  requirements: "",
  screening_questions: [],
};

/**
 * Converts HTML string to structured JSONB content blocks for the API.
 */
function htmlToJsonBlocks(html: string): Array<{ type: string; content: string }> {
  if (!html || html.trim() === "" || html === "<br>") return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: Array<{ type: string; content: string }> = [];

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({ type: "paragraph", content: text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const content = el.innerHTML;

      switch (tag) {
        case "h1":
        case "h2":
        case "h3":
        case "h4":
          blocks.push({ type: "heading", content });
          break;
        case "ul":
        case "ol":
          blocks.push({ type: "list", content });
          break;
        default:
          blocks.push({ type: "paragraph", content });
      }
    }
  });

  return blocks.length > 0 ? blocks : [{ type: "paragraph", content: html }];
}

/**
 * Converts JSONB content blocks back to HTML for the editor.
 */
function jsonBlocksToHtml(
  blocks: Array<{ type: string; content: string }> | null | undefined
): string {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return "";

  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h2>${block.content}</h2>`;
        case "list":
          return `<ul>${block.content}</ul>`;
        default:
          return `<p>${block.content}</p>`;
      }
    })
    .join("");
}

export default function VacancyEditor({
  editingVacancyId,
  onSaved,
  onCancel,
}: VacancyEditorProps) {
  const [form, setForm] = useState<VacancyFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditMode = !!editingVacancyId;

  // Load existing vacancy data for edit mode
  const loadVacancy = useCallback(async (vacancyId: string) => {
    setLoadingEdit(true);
    setError(null);
    try {
      const token = getCookie("aivory_access_token");
      const res = await fetch(
        `${CAREERS_SERVICE_URL}/api/admin/vacancies/${vacancyId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to load vacancy (${res.status})`);
      }

      const data = await res.json();
      setForm({
        title: data.title ?? "",
        department: data.department ?? "",
        location: data.location ?? "",
        employment_type: data.employment_type ?? "",
        description: jsonBlocksToHtml(data.description),
        requirements: jsonBlocksToHtml(data.requirements),
        screening_questions: data.screening_questions ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load vacancy data"
      );
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  useEffect(() => {
    if (editingVacancyId) {
      loadVacancy(editingVacancyId);
    } else {
      setForm(EMPTY_FORM);
      setError(null);
      setSuccessMessage(null);
    }
  }, [editingVacancyId, loadVacancy]);

  const updateField = <K extends keyof VacancyFormData>(
    field: K,
    value: VacancyFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const validateForm = (): string | null => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.description.trim() && form.description !== "")
      return "Description is required.";

    // Validate screening questions have text
    const emptyQuestion = form.screening_questions.find(
      (q) => !q.question.trim()
    );
    if (emptyQuestion) return "All screening questions must have text.";

    return null;
  };

  const submitVacancy = async (status: "open" | "draft") => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getCookie("aivory_access_token");
      const payload = {
        title: form.title.trim(),
        department: form.department.trim() || null,
        location: form.location.trim() || null,
        employment_type: form.employment_type || null,
        description: htmlToJsonBlocks(form.description),
        requirements: htmlToJsonBlocks(form.requirements),
        screening_questions: form.screening_questions.filter(
          (q) => q.question.trim() !== ""
        ),
        status,
      };

      const url = isEditMode
        ? `${CAREERS_SERVICE_URL}/api/admin/vacancies/${editingVacancyId}`
        : `${CAREERS_SERVICE_URL}/api/admin/vacancies`;

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail ?? `Failed to save vacancy (${res.status})`
        );
      }

      const action =
        status === "open"
          ? isEditMode
            ? "updated and published"
            : "published"
          : isEditMode
          ? "updated as draft"
          : "saved as draft";
      setSuccessMessage(`Vacancy ${action} successfully.`);

      if (!isEditMode) {
        setForm(EMPTY_FORM);
      }

      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vacancy");
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
        <p className="text-sm text-gray-400">Loading vacancy data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">
          {isEditMode ? "Edit Vacancy" : "Create Vacancy"}
        </h2>
        {isEditMode && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← Back to Create New
          </button>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-[#00e59e]/30 bg-[#00e59e]/10 px-4 py-3">
          <p className="text-sm text-[#00e59e]">{successMessage}</p>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="vacancy-title"
            className="block text-sm font-medium text-gray-300"
          >
            Job Title <span className="text-red-400">*</span>
          </label>
          <input
            id="vacancy-title"
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Senior Frontend Developer"
            className="w-full rounded-lg border border-white/[0.12] bg-[#1f1f1c] px-4 py-2.5 text-sm text-white/90 placeholder:text-gray-500 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/20"
          />
        </div>

        {/* Department & Location row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="vacancy-department"
              className="block text-sm font-medium text-gray-300"
            >
              Department
            </label>
            <input
              id="vacancy-department"
              type="text"
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full rounded-lg border border-white/[0.12] bg-[#1f1f1c] px-4 py-2.5 text-sm text-white/90 placeholder:text-gray-500 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="vacancy-location"
              className="block text-sm font-medium text-gray-300"
            >
              Location
            </label>
            <input
              id="vacancy-location"
              type="text"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. Remote, Amsterdam"
              className="w-full rounded-lg border border-white/[0.12] bg-[#1f1f1c] px-4 py-2.5 text-sm text-white/90 placeholder:text-gray-500 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/20"
            />
          </div>
        </div>

        {/* Employment type */}
        <div className="space-y-1.5">
          <label
            htmlFor="vacancy-employment-type"
            className="block text-sm font-medium text-gray-300"
          >
            Employment Type
          </label>
          <select
            id="vacancy-employment-type"
            value={form.employment_type}
            onChange={(e) => updateField("employment_type", e.target.value)}
            className="w-full rounded-lg border border-white/[0.12] bg-[#1f1f1c] px-4 py-2.5 text-sm text-white/90 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/20"
          >
            <option value="" className="bg-[#1f1f1c] text-gray-400">
              Select employment type
            </option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#1f1f1c]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description - Rich Editor */}
        <RichTextEditor
          label="Job Description *"
          value={form.description}
          onChange={(html) => updateField("description", html)}
          placeholder="Describe the role, responsibilities, and what the candidate will be working on..."
          minHeight="200px"
        />

        {/* Requirements - Rich Editor */}
        <RichTextEditor
          label="Requirements"
          value={form.requirements}
          onChange={(html) => updateField("requirements", html)}
          placeholder="List required skills, experience, qualifications..."
          minHeight="150px"
        />

        {/* Screening Questions */}
        <ScreeningQuestionBuilder
          questions={form.screening_questions}
          onChange={(questions) => updateField("screening_questions", questions)}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 border-t border-white/[0.07] pt-5">
        <button
          type="button"
          onClick={() => submitVacancy("open")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#00e59e] px-5 py-2.5 text-sm font-medium text-[#1f1f1c] hover:bg-[#00e59e]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            "Saving..."
          ) : isEditMode ? (
            "Update & Publish"
          ) : (
            "Publish Vacancy"
          )}
        </button>

        <button
          type="button"
          onClick={() => submitVacancy("draft")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-gray-300 ring-1 ring-inset ring-white/[0.12] hover:bg-white/[0.05] hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? "Saving..."
            : isEditMode
            ? "Update as Draft"
            : "Save as Draft"}
        </button>

        {isEditMode && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="ml-auto text-sm text-gray-500 hover:text-gray-300 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
