"use client";

import { useRef } from "react";
import { Bold, Eye, Heading, Italic, List, ListOrdered, ShieldCheck, Type } from "lucide-react";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { markdownBlocks, markdownInline } from "@/lib/admin/markdown";

function Inline({ text }: { text: string }) {
  return markdownInline(text).map((part, i) => part.kind === "bold" ? <strong key={i}>{part.text}</strong>
    : part.kind === "italic" ? <em key={i}>{part.text}</em> : part.text);
}

export function MarkdownPreview({ value }: { value: string }) {
  return <div className="space-y-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
    {markdownBlocks(value).map((block, i) => {
      if (block.kind === "heading") {
        const Heading = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
        return <Heading key={i} className={`font-semibold ${block.level === 1 ? "text-xl" : block.level === 2 ? "text-lg" : "text-base"}`}><Inline text={block.lines[0]} /></Heading>;
      }
      if (block.kind === "ordered" || block.kind === "unordered") {
        const List = block.kind === "ordered" ? "ol" : "ul";
        return <List key={i} className={`pl-6 ${block.kind === "ordered" ? "list-decimal" : "list-disc"}`}>{block.lines.map((line, j) => <li key={j}><Inline text={line} /></li>)}</List>;
      }
      return <p key={i} className="min-h-4"><Inline text={block.lines[0]} /></p>;
    })}
  </div>;
}

type Props = Omit<React.ComponentProps<"textarea">, "onChange" | "value"> & {
  value: string; label: string; onValueChange: (value: string) => void;
};
export function MarkdownEditor({ value, label, onValueChange, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const format = (prefix: string, suffix: string, placeholder: string, lines = false) => {
    const input = ref.current;
    if (!input) return;
    const start = lines ? value.lastIndexOf("\n", input.selectionStart - 1) + 1 : input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const replacement = lines ? selected.split("\n").map((line) => `${prefix}${line}`).join("\n") : `${prefix}${selected}${suffix}`;
    onValueChange(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length); });
  };
  return <div className="min-w-0 space-y-3">
    <div className="min-w-0 rounded-xl border border-border bg-surface-muted p-2.5">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted"><Type className="size-4 text-accent" aria-hidden="true" />Markdown formatting</p>
    <div role="group" aria-label={`${label} formatting`} className="flex flex-wrap gap-2">
      <Button size="sm" variant="soft-info" aria-label="Insert bold Markdown" onClick={() => format("**", "**", "bold text")}><Bold className="size-3.5" aria-hidden="true" /><strong>Bold</strong></Button>
      <Button size="sm" variant="soft-violet" aria-label="Insert italic Markdown" onClick={() => format("*", "*", "italic text")}><Italic className="size-3.5" aria-hidden="true" /><em>Italic</em></Button>
      <Button size="sm" variant="soft-info" aria-label="Insert Markdown heading" onClick={() => format("# ", "", "Heading", true)}><Heading className="size-3.5" aria-hidden="true" />Heading</Button>
      <Button size="sm" variant="soft-success" aria-label="Insert Markdown bullet list" onClick={() => format("- ", "", "List item", true)}><List className="size-3.5" aria-hidden="true" />Bullets</Button>
      <Button size="sm" variant="soft-warning" aria-label="Insert Markdown numbered list" onClick={() => format("1. ", "", "List item", true)}><ListOrdered className="size-3.5" aria-hidden="true" />Numbered list</Button>
    </div>
    </div>
    <textarea {...props} ref={ref} value={value} rows={7} className={`${inputClass} h-auto py-2`} onChange={(e) => onValueChange(e.target.value)} />
    <section aria-label={`${label} formatted preview`} className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-card">
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-2.5"><span className={cn("rounded-lg p-1.5", palette.violet.tile)}><Eye className="size-4" aria-hidden="true" /></span><h3 className="font-medium">Formatted preview · Markdown</h3></div>
      <div className="min-w-0 p-3 leading-relaxed">
      {value ? <MarkdownPreview value={value} /> : <p className="text-muted">Your formatted description will appear here.</p>}
      </div>
      <p className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted"><ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />Safe preview · HTML remains plain text</p>
    </section>
  </div>;
}
