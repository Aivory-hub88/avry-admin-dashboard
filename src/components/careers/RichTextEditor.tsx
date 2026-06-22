"use client";
import React, { useRef, useCallback } from "react";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * A simple WYSIWYG rich text editor using contentEditable.
 * Stores content as HTML string, which is converted to JSONB blocks on submit.
 */
export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight = "180px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [onChange]
  );

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-white/[0.12] bg-[#1f1f1c] px-2 py-1.5">
        <ToolbarButton onClick={() => execCommand("bold")} title="Bold">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("italic")} title="Italic">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => execCommand("underline")}
          title="Underline"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onClick={() => execCommand("formatBlock", "h2")}
          title="Heading"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => execCommand("formatBlock", "h3")}
          title="Subheading"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => execCommand("formatBlock", "p")}
          title="Paragraph"
        >
          P
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onClick={() => execCommand("insertUnorderedList")}
          title="Bullet List"
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => execCommand("insertOrderedList")}
          title="Numbered List"
        >
          1. List
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          onClick={() => {
            const url = prompt("Enter link URL:");
            if (url) execCommand("createLink", url);
          }}
          title="Insert Link"
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          onClick={() => execCommand("removeFormat")}
          title="Clear Formatting"
        >
          ✕
        </ToolbarButton>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value }}
        className="w-full rounded-b-lg border border-white/[0.12] bg-[#1f1f1c] px-4 py-3 text-sm text-white/90 focus:border-[#00e59e]/50 focus:outline-none focus:ring-1 focus:ring-[#00e59e]/20 prose prose-invert prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-500"
        style={{ minHeight }}
        data-placeholder={placeholder}
        role="textbox"
        aria-label={label}
        aria-multiline="true"
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-4 w-px bg-white/[0.12]" />;
}
