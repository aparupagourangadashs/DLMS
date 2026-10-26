export type MarkdownBlock = { kind: "paragraph" | "heading" | "unordered" | "ordered"; lines: string[]; level?: number };
export type MarkdownInline = { kind: "text" | "bold" | "italic"; text: string };

export function markdownInline(text: string): MarkdownInline[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map((part) =>
    part.startsWith("**") && part.endsWith("**") ? { kind: "bold", text: part.slice(2, -2) }
      : part.startsWith("*") && part.endsWith("*") ? { kind: "italic", text: part.slice(1, -1) }
        : { kind: "text", text: part });
}

export function markdownBlocks(value: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const line of value.replaceAll("\r\n", "\n").split("\n")) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (heading) blocks.push({ kind: "heading", lines: [heading[2]], level: heading[1].length });
    else if (unordered || ordered) {
      const kind = unordered ? "unordered" : "ordered";
      const text = (unordered ?? ordered)![1];
      const last = blocks.at(-1);
      if (last?.kind === kind) last.lines.push(text);
      else blocks.push({ kind, lines: [text] });
    } else blocks.push({ kind: "paragraph", lines: [line] });
  }
  return blocks;
}
