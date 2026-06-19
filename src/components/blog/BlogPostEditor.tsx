"use client";
import React, { useState, useCallback } from "react";
import { getCookie } from "@/lib/cookies";

const BLOG_SERVICE_URL =
  "";

// --- Content Block Types ---

export interface ContentBlock {
  type: "heading" | "paragraph" | "code" | "list" | "image" | "link";
  text?: string;
  level?: number;
  language?: string;
  url?: string;
  alt?: string;
  href?: string;
  items?: string[];
  style?: "ordered" | "unordered";
}

export interface BlogPostData {
  id?: string;
  title: string;
  author_name: string;
  excerpt: string;
  thumbnail_url: string;
  body: { blocks: ContentBlock[] };
}

interface BlogPostEditorProps {
  /** If provided, the editor is in "edit" mode with pre-populated data */
  editPost?: BlogPostData;
  /** Callback when the post is successfully saved */
  onSaved?: () => void;
}

// --- Block Editor Sub-components ---

function BlockToolbar({ onAdd }: { onAdd: (type: ContentBlock["type"]) => void }) {
  const tools: { type: ContentBlock["type"]; label: string; icon: string }[] = [
    { type: "heading", label: "Heading", icon: "H" },
    { type: "paragraph", label: "Paragraph", icon: "¶" },
    { type: "code", label: "Code", icon: "</>" },
    { type: "list", label: "List", icon: "≡" },
    { type: "image", label: "Image", icon: "🖼" },
    { type: "link", label: "Link", icon: "🔗" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {tools.map((tool) => (
        <button
          key={tool.type}
          type="button"
          onClick={() => onAdd(tool.type)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          title={`Add ${tool.label}`}
        >
          <span className="mr-1">{tool.icon}</span>
          {tool.label}
        </button>
      ))}
    </div>
  );
}

function BlockEditor({
  block,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: ContentBlock;
  index: number;
  onChange: (index: number, block: ContentBlock) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const inputClass =
    "w-full bg-[#1f1f1c] border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00e59e]/50 focus:ring-1 focus:ring-[#00e59e]/30";

  const renderFields = () => {
    switch (block.type) {
      case "heading":
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={block.level ?? 2}
                onChange={(e) =>
                  onChange(index, { ...block, level: parseInt(e.target.value) })
                }
                className="bg-[#1f1f1c] border border-white/10 rounded-md px-2 py-2 text-sm text-white focus:outline-none focus:border-[#00e59e]/50"
              >
                {[1, 2, 3, 4, 5, 6].map((l) => (
                  <option key={l} value={l}>
                    H{l}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={block.text ?? ""}
                onChange={(e) => onChange(index, { ...block, text: e.target.value })}
                placeholder="Heading text..."
                className={inputClass}
              />
            </div>
          </div>
        );

      case "paragraph":
        return (
          <textarea
            value={block.text ?? ""}
            onChange={(e) => onChange(index, { ...block, text: e.target.value })}
            placeholder="Paragraph text... (supports **bold**, *italic*, `code`)"
            rows={3}
            className={`${inputClass} resize-y`}
          />
        );

      case "code":
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.language ?? ""}
              onChange={(e) => onChange(index, { ...block, language: e.target.value })}
              placeholder="Language (e.g., javascript, python)"
              className={inputClass}
            />
            <textarea
              value={block.text ?? ""}
              onChange={(e) => onChange(index, { ...block, text: e.target.value })}
              placeholder="Code content..."
              rows={5}
              className={`${inputClass} font-mono resize-y`}
            />
          </div>
        );

      case "list": {
        const items = block.items ?? [""];
        return (
          <div className="space-y-2">
            <select
              value={block.style ?? "unordered"}
              onChange={(e) =>
                onChange(index, {
                  ...block,
                  style: e.target.value as "ordered" | "unordered",
                })
              }
              className="bg-[#1f1f1c] border border-white/10 rounded-md px-2 py-2 text-sm text-white focus:outline-none focus:border-[#00e59e]/50"
            >
              <option value="unordered">Unordered (bullet)</option>
              <option value="ordered">Ordered (numbered)</option>
            </select>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx] = e.target.value;
                    onChange(index, { ...block, items: newItems });
                  }}
                  placeholder={`List item ${idx + 1}`}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newItems = items.filter((_, i) => i !== idx);
                    onChange(index, { ...block, items: newItems.length ? newItems : [""] });
                  }}
                  className="px-2 text-red-400 hover:text-red-300 text-sm"
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange(index, { ...block, items: [...items, ""] })}
              className="text-xs text-[#00e59e] hover:text-[#00c88a] transition-colors"
            >
              + Add item
            </button>
          </div>
        );
      }

      case "image":
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.url ?? ""}
              onChange={(e) => onChange(index, { ...block, url: e.target.value })}
              placeholder="Image URL"
              className={inputClass}
            />
            <input
              type="text"
              value={block.alt ?? ""}
              onChange={(e) => onChange(index, { ...block, alt: e.target.value })}
              placeholder="Alt text (describes the image)"
              className={inputClass}
            />
          </div>
        );

      case "link":
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.href ?? ""}
              onChange={(e) => onChange(index, { ...block, href: e.target.value })}
              placeholder="URL (https://...)"
              className={inputClass}
            />
            <input
              type="text"
              value={block.text ?? ""}
              onChange={(e) => onChange(index, { ...block, text: e.target.value })}
              placeholder="Link text"
              className={inputClass}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const typeLabel: Record<string, string> = {
    heading: "Heading",
    paragraph: "Paragraph",
    code: "Code Block",
    list: "List",
    image: "Image",
    link: "Link",
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#1f1f1c] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {typeLabel[block.type] ?? block.type}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={isLast}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-red-400 hover:text-red-300 transition-colors ml-2"
            title="Remove block"
          >
            ✕
          </button>
        </div>
      </div>
      {renderFields()}
    </div>
  );
}

// --- Preview Renderer ---

function PreviewRenderer({ blocks }: { blocks: ContentBlock[] }) {
  function formatInlineMarkup(text: string): string {
    let html = text;
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");
    html = html.replace(
      /`(.+?)`/g,
      '<code class="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-sm font-mono text-[#00e59e]">$1</code>'
    );
    return html;
  }

  return (
    <div className="prose-custom space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const level = block.level ?? 2;
            const sizes: Record<number, string> = {
              1: "text-3xl font-bold",
              2: "text-2xl font-bold",
              3: "text-xl font-semibold",
              4: "text-lg font-semibold",
              5: "text-base font-medium",
              6: "text-sm font-medium",
            };
            const className = `${sizes[level] ?? sizes[2]} text-white`;
            if (level === 1) return <h1 key={index} className={className}>{block.text}</h1>;
            if (level === 3) return <h3 key={index} className={className}>{block.text}</h3>;
            if (level === 4) return <h4 key={index} className={className}>{block.text}</h4>;
            if (level === 5) return <h5 key={index} className={className}>{block.text}</h5>;
            if (level === 6) return <h6 key={index} className={className}>{block.text}</h6>;
            return <h2 key={index} className={className}>{block.text}</h2>;
          }

          case "paragraph":
            return (
              <p
                key={index}
                className="text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text ?? "") }}
              />
            );

          case "code":
            return (
              <pre
                key={index}
                className="rounded-lg bg-[#0a0a0a] border border-white/10 p-4 overflow-x-auto"
              >
                <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                  {block.text}
                </code>
              </pre>
            );

          case "list": {
            const items = block.items ?? [];
            const isOrdered = block.style === "ordered";
            const ListTag = isOrdered ? "ol" : "ul";
            const listClass = isOrdered
              ? "list-decimal list-inside space-y-1"
              : "list-disc list-inside space-y-1";
            return (
              <ListTag key={index} className={`${listClass} text-gray-300`}>
                {items.map((item, idx) => (
                  <li
                    key={idx}
                    dangerouslySetInnerHTML={{ __html: formatInlineMarkup(item) }}
                  />
                ))}
              </ListTag>
            );
          }

          case "image":
            return (
              <figure key={index}>
                {block.url && (
                  <img
                    src={block.url}
                    alt={block.alt ?? ""}
                    className="w-full rounded-lg border border-white/10"
                  />
                )}
                {block.alt && (
                  <figcaption className="text-center text-xs text-gray-500 mt-2">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );

          case "link":
            return (
              <p key={index}>
                <a
                  href={block.href ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00e59e] underline hover:text-[#00c88a] transition-colors"
                >
                  {block.text || block.href}
                </a>
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// --- Confirmation Dialog ---

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#2a2a27] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-3">Confirm Publish</h3>
        <p className="text-sm text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[#00e59e] text-[#1f1f1c] hover:bg-[#00c88a] transition-colors"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Editor Component ---

export default function BlogPostEditor({ editPost, onSaved }: BlogPostEditorProps) {
  const [title, setTitle] = useState(editPost?.title ?? "");
  const [authorName, setAuthorName] = useState(editPost?.author_name ?? "");
  const [excerpt, setExcerpt] = useState(editPost?.excerpt ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(editPost?.thumbnail_url ?? "");
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    editPost?.body?.blocks ?? [{ type: "paragraph", text: "" }]
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const addBlock = useCallback((type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = { type };
    switch (type) {
      case "heading":
        newBlock.text = "";
        newBlock.level = 2;
        break;
      case "paragraph":
        newBlock.text = "";
        break;
      case "code":
        newBlock.text = "";
        newBlock.language = "";
        break;
      case "list":
        newBlock.items = [""];
        newBlock.style = "unordered";
        break;
      case "image":
        newBlock.url = "";
        newBlock.alt = "";
        break;
      case "link":
        newBlock.href = "";
        newBlock.text = "";
        break;
    }
    setBlocks((prev) => [...prev, newBlock]);
  }, []);

  const updateBlock = useCallback((index: number, block: ContentBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveBlockUp = useCallback((index: number) => {
    if (index === 0) return;
    setBlocks((prev) => {
      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  }, []);

  const moveBlockDown = useCallback((index: number) => {
    setBlocks((prev) => {
      if (index >= prev.length - 1) return prev;
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  }, []);

  const savePost = async (status: "published" | "draft") => {
    setError(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!authorName.trim()) {
      setError("Author name is required.");
      return;
    }
    if (blocks.length === 0) {
      setError("Post content cannot be empty.");
      return;
    }

    setSaving(true);

    try {
      const token = getCookie("aivory_access_token");
      const payload = {
        title: title.trim(),
        author_name: authorName.trim(),
        excerpt: excerpt.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        body: { blocks },
        status,
      };

      const isEdit = !!editPost?.id;
      const url = isEdit
        ? `/admin/api/admin/blog/api/admin/posts/${editPost.id}`
        : `/admin/api/admin/blog/api/admin/posts`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Failed to save post (${res.status})`);
      }

      setSuccessMsg(
        status === "published"
          ? "Post published successfully!"
          : "Post saved as draft."
      );

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = () => {
    if (!title.trim() || !authorName.trim()) {
      setError("Title and author name are required.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmPublish = () => {
    setShowConfirm(false);
    savePost("published");
  };

  const inputClass =
    "w-full bg-[#1f1f1c] border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00e59e]/50 focus:ring-1 focus:ring-[#00e59e]/30";

  return (
    <div className="space-y-5">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {editPost?.id ? "Edit Post" : "Create New Post"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
              showPreview
                ? "bg-[#00e59e]/10 border-[#00e59e]/30 text-[#00e59e]"
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
            }`}
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => savePost("draft")}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handlePublishClick}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[#00e59e] text-[#1f1f1c] hover:bg-[#00c88a] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="px-4 py-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {showPreview ? (
        /* Preview Mode */
        <div className="rounded-xl border border-white/[0.07] bg-[#1a1a17] p-8">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Preview
          </h3>
          <div className="border-t border-white/10 pt-6">
            {title && <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>}
            {authorName && (
              <p className="text-sm text-gray-400 mb-6">{authorName}</p>
            )}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="Thumbnail"
                className="w-full max-h-64 object-cover rounded-lg border border-white/10 mb-6"
              />
            )}
            <PreviewRenderer blocks={blocks} />
          </div>
        </div>
      ) : (
        /* Editor Mode */
        <div className="space-y-4">
          {/* Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Blog post title"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Author Name *
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author name"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of the post (optional)"
              rows={2}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Thumbnail URL
            </label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://... (optional)"
              className={inputClass}
            />
          </div>

          {/* Content Blocks */}
          <div className="border-t border-white/10 pt-4">
            <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
              Content Blocks
            </label>
            <BlockToolbar onAdd={addBlock} />
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <BlockEditor
                  key={index}
                  block={block}
                  index={index}
                  onChange={updateBlock}
                  onRemove={removeBlock}
                  onMoveUp={moveBlockUp}
                  onMoveDown={moveBlockDown}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                />
              ))}
              {blocks.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No content blocks yet. Use the toolbar above to add content.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <ConfirmDialog
          message="This post will be publicly visible on the blog page. Are you sure you want to publish it now?"
          onConfirm={handleConfirmPublish}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
