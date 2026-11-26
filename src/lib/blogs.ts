/** An article as the public list shows it. */
export type PublicBlogCard = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    /** A picture the editor uploaded, or null. */
    coverUrl: string | null;
    /** The author's display name, or null when the article has none. */
    author: string | null;
    /** The IST day it was first published, YYYY-MM-DD. */
    publishedOn: string;
    minutes: number;
};

export type PublicBlog = PublicBlogCard & {
    /** The summary the editor wrote; empty when they left it out. */
    summary: string;
    /** Markdown, shown with the safe renderer. */
    body: string;
};

const WORDS_PER_MINUTE = 200;

/** Markdown markers removed, so only the words are left. */
function plainText(markdown: string) {
    return markdown
        .replace(/^\s*#{1,3}\s+/gm, "")
        .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
        .replace(/\*\*([^*\n]+)\*\*/g, "$1")
        .replace(/\*([^*\n]+)\*/g, "$1");
}

export function readingMinutes(body: string) {
    const words = plainText(body).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function firstParagraph(body: string) {
    for (const line of body.replaceAll("\r\n", "\n").split("\n")) {
        const text = line.trim();
        if (text && !/^#{1,3}\s/.test(text)) return plainText(text).trim();
    }
    return "";
}

/** The summary the editor wrote, or else the opening paragraph of the article, cut at a word. */
export function blogExcerpt(summary: string | null | undefined, body: string, max = 180) {
    const source = summary?.trim() || firstParagraph(body);
    if (source.length <= max) return source;
    const cut = source.slice(0, max);
    const space = cut.lastIndexOf(" ");
    return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "")}\u2026`;
}
