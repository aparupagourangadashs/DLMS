import { markdownBlocks, markdownInline } from "@/lib/admin/markdown";

function Inline({ text }: { text: string }) {
    return markdownInline(text).map((part, i) =>
        part.kind === "bold" ? <strong key={i}>{part.text}</strong> : part.kind === "italic" ? <em key={i}>{part.text}</em> : part.text);
}

/** Renders a small, safe Markdown subset (headings, lists, bold, italic). Raw HTML and links are never produced. */
export function Markdown({ value }: { value: string }) {
    return <>{markdownBlocks(value).map((block, i) => {
        if (block.kind === "heading") {
            const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
            return <Tag key={i}><Inline text={block.lines[0]} /></Tag>;
        }
        if (block.kind === "unordered" || block.kind === "ordered") {
            const List = block.kind === "ordered" ? "ol" : "ul";
            return <List key={i}>{block.lines.map((line, j) => <li key={j}><Inline text={line} /></li>)}</List>;
        }
        const text = block.lines[0];
        return text.trim() ? <p key={i}><Inline text={text} /></p> : null;
    })}</>;
}
