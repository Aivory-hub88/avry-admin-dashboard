"use client";
import React, { useState, useCallback } from "react";
import { getCookie } from "@/lib/cookies";

/** Shape of a content block from the Rich Editor JSONB body */
interface ContentBlock {
  type: string;
  content?: string;
  text?: string;
  [key: string]: unknown;
}

interface BlogPost {
  id: string;
  title: string;
  body: ContentBlock[];
  redacted_sections: number[];
}

interface RedactionInterfaceProps {
  post: BlogPost;
  /** Called after a successful redaction update; passes updated redacted_sections */
  onRedactionSaved?: (redactedSections: number[]) => void;
  /** Called when the user wants to close/dismiss the interface */
  onClose?: () => void;
}

const BLOG_SERVICE_URL =
  "";

/**
 * Renders a preview string for a content block.
 * Extracts text/content from the JSONB block structure.
 */
function getBlockPreview(block: ContentBlock, index: number): string {
  const text = block.content ?? block.text ?? "";
  if (typeof text === "string" && text.length > 0) {
    return text.length > 120 ? text.slice(0, 120) + "…" : text;
  }
  return `Block ${index + 1} (${block.type ?? "unknown"})`;
}

/**
 * RedactionInterface allows administrators to mark specific content blocks
 * of a blog post as redacted. The component displays each block with a toggle
 * and submits the selected indices via PATCH /api/admin/posts/{post_id}/redact.
 */
export default function RedactionInterface({
  post,
  onRedactionSaved,
  onClose,
}: RedactionInterfaceProps) {
  const [redactedIndices, setRedactedIndices] = useState<Set<number>>(
    () => new Set(post.redacted_sections ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleBlock = useCallback((index: number) => {
    setRedactedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    setSuccess(false);
    setError(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const token = getCookie("aivory_access_token");
    const redactedSections = Array.from(redactedIndices).sort((a, b) => a - b);

    try {
      const res = await fetch(
        `/admin/api/admin/blog/api/admin/posts/${post.id}/redact`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ redacted_sections: redactedSections }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.detail ?? `Failed to update redaction (${res.status})`
        );
      }

      setSuccess(true);
      onRedactionSaved?.(redactedSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const blocks = post.body ?? [];
  const hasChanges =
    JSON.stringify(Array.from(redactedIndices).sort((a, b) => a - b)) !==
    JSON.stringify([...(post.redacted_sections ?? [])].sort((a, b) => a - b));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Redact Sections</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select content blocks to redact for &ldquo;{post.title}&rdquo;
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-sm"
            aria-label="Close redaction interface"
          >
            ✕
          </button>
        )}
      </div>

      {/* Block list */}
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
          <p className="text-sm text-gray-400">
            This post has no content blocks to redact.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => {
            const isRedacted = redactedIndices.has(index);
            return (
              <label
                key={index}
                className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  isRedacted
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-white/[0.07] bg-[#2a2a27] hover:border-white/[0.15]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isRedacted}
                  onChange={() => toggleBlock(index)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-[#1f1f1c] text-red-500 focus:ring-red-500 focus:ring-offset-0 shrink-0"
                  aria-label={`Redact block ${index + 1}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {block.type ?? "block"}
                    </span>
                    <span className="text-xs text-gray-600">
                      #{index + 1}
                    </span>
                    {isRedacted && (
                      <span className="text-xs font-medium text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
                        REDACTED
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-1 break-words ${
                      isRedacted
                        ? "text-gray-500 line-through"
                        : "text-gray-300"
                    }`}
                  >
                    {getBlockPreview(block, index)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Summary and actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.07]">
        <p className="text-sm text-gray-400">
          {redactedIndices.size} of {blocks.length} block
          {blocks.length !== 1 ? "s" : ""} marked as redacted
        </p>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              saving || !hasChanges
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {saving ? "Saving…" : "Save Redactions"}
          </button>
        </div>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
          <p className="text-sm text-green-400">
            Redactions saved successfully.
          </p>
        </div>
      )}
    </div>
  );
}
