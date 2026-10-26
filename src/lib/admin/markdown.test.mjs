import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownBlocks, markdownInline } from "./markdown.ts";

test("headings and consecutive ordered/unordered lists produce structured blocks", () => {
  assert.deepEqual(markdownBlocks("# Title\n- First\n- Second\n\n1. One\n2. Two"), [
    { kind: "heading", level: 1, lines: ["Title"] },
    { kind: "unordered", lines: ["First", "Second"] },
    { kind: "paragraph", lines: [""] },
    { kind: "ordered", lines: ["One", "Two"] },
  ]);
});
test("bold and italic become explicit inline tokens", () => {
  assert.deepEqual(markdownInline("A **bold** and *italic*."), [
    { kind: "text", text: "A " }, { kind: "bold", text: "bold" },
    { kind: "text", text: " and " }, { kind: "italic", text: "italic" },
    { kind: "text", text: "." },
  ]);
});
test("HTML and script URLs remain plain text, not executable markup", () => {
  const source = '<img src=x onerror=alert(1)> [click](javascript:alert(1))';
  assert.deepEqual(markdownInline(source), [{ kind: "text", text: source }]);
  assert.deepEqual(markdownBlocks(source), [{ kind: "paragraph", lines: [source] }]);
});
test("legacy plain text, unmatched markers and blank lines are retained", () => {
  assert.deepEqual(markdownInline("Plain **unfinished"), [{ kind: "text", text: "Plain **unfinished" }]);
  assert.deepEqual(markdownBlocks("Old description\r\n\r\nNext line").map((b) => b.lines[0]), ["Old description", "", "Next line"]);
});
