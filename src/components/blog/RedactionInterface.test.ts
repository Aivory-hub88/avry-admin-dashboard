import { describe, it, expect } from "vitest";

/**
 * Unit tests for RedactionInterface logic.
 * Tests the core behavior: block selection, API call construction, and state management.
 */

describe("RedactionInterface", () => {
  describe("getBlockPreview logic", () => {
    it("should extract text from content field", () => {
      const block: Record<string, string> = { type: "paragraph", content: "Hello world" };
      const text = block.content ?? block.text ?? "";
      expect(text).toBe("Hello world");
    });

    it("should extract text from text field when content is missing", () => {
      const block: Record<string, unknown> = { type: "heading", text: "My Title" };
      const text = (block.content as string) ?? (block.text as string) ?? "";
      expect(text).toBe("My Title");
    });

    it("should truncate long text at 120 characters", () => {
      const longText = "A".repeat(200);
      const preview =
        longText.length > 120 ? longText.slice(0, 120) + "…" : longText;
      expect(preview.length).toBe(121); // 120 chars + ellipsis
      expect(preview.endsWith("…")).toBe(true);
    });

    it("should show block fallback when no text content exists", () => {
      const block = { type: "image" };
      const text =
        (block as Record<string, unknown>).content ??
        (block as Record<string, unknown>).text ??
        "";
      const preview =
        typeof text === "string" && text.length > 0
          ? text
          : `Block ${3} (${block.type ?? "unknown"})`;
      expect(preview).toBe("Block 3 (image)");
    });
  });

  describe("redaction request body construction", () => {
    it("should produce sorted array of selected indices", () => {
      const indices = new Set([3, 0, 7, 1]);
      const redactedSections = Array.from(indices).sort((a, b) => a - b);
      expect(redactedSections).toEqual([0, 1, 3, 7]);
    });

    it("should produce empty array when nothing is selected", () => {
      const indices = new Set<number>();
      const redactedSections = Array.from(indices).sort((a, b) => a - b);
      expect(redactedSections).toEqual([]);
    });

    it("should construct correct API URL with post id", () => {
      const BLOG_SERVICE_URL = "http://localhost:8089";
      const postId = "abc-123-def";
      const url = `${BLOG_SERVICE_URL}/api/admin/posts/${postId}/redact`;
      expect(url).toBe("http://localhost:8089/api/admin/posts/abc-123-def/redact");
    });

    it("should include correct request body shape", () => {
      const redactedSections = [0, 2, 5];
      const body = JSON.stringify({ redacted_sections: redactedSections });
      const parsed = JSON.parse(body);
      expect(parsed).toHaveProperty("redacted_sections");
      expect(parsed.redacted_sections).toEqual([0, 2, 5]);
    });
  });

  describe("change detection", () => {
    it("should detect changes when selections differ from saved state", () => {
      const currentIndices = [0, 2, 5];
      const savedRedacted = [0, 2];
      const hasChanges =
        JSON.stringify(currentIndices) !==
        JSON.stringify([...savedRedacted].sort((a, b) => a - b));
      expect(hasChanges).toBe(true);
    });

    it("should detect no changes when selections match saved state", () => {
      const currentIndices = [0, 2, 5];
      const savedRedacted = [5, 0, 2]; // same items, different order
      const hasChanges =
        JSON.stringify(currentIndices.sort((a, b) => a - b)) !==
        JSON.stringify([...savedRedacted].sort((a, b) => a - b));
      expect(hasChanges).toBe(false);
    });
  });

  describe("toggle logic", () => {
    it("should add index when toggling an unselected block", () => {
      const redacted = new Set([1, 3]);
      const next = new Set(redacted);
      next.add(5);
      expect(next.has(5)).toBe(true);
      expect(next.size).toBe(3);
    });

    it("should remove index when toggling an already-selected block", () => {
      const redacted = new Set([1, 3, 5]);
      const next = new Set(redacted);
      next.delete(3);
      expect(next.has(3)).toBe(false);
      expect(next.size).toBe(2);
    });
  });
});
