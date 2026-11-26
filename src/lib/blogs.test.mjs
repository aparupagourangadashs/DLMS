import assert from "node:assert/strict";
import { test } from "node:test";
import { blogExcerpt, readingMinutes } from "./blogs.ts";

test("the excerpt is the written summary, or the opening paragraph without Markdown marks", () => {
    assert.equal(blogExcerpt("  A short note.  ", "Body text."), "A short note.");
    assert.equal(blogExcerpt("", "# Heading\n\nThe **first** paragraph, with *style*.\n\nSecond."), "The first paragraph, with style.");
    assert.equal(blogExcerpt(null, "- one item\n- two"), "one item");
    assert.equal(blogExcerpt(undefined, "1. First step\n2. Second"), "First step");
    assert.equal(blogExcerpt("", "# Only a heading"), "");
    assert.equal(blogExcerpt("", "Line one\r\nLine two"), "Line one");
});

test("a long excerpt is cut at a word and ends with an ellipsis", () => {
    const excerpt = blogExcerpt("", "word ".repeat(100).trim(), 40);
    assert.equal(excerpt, `${"word ".repeat(8).trim()}\u2026`);
    assert.equal(blogExcerpt("", "x".repeat(300), 50), `${"x".repeat(50)}\u2026`);
    assert.equal(blogExcerpt("", "Ends here, and then goes on and on for a while longer than allowed.", 20), "Ends here, and then\u2026", "trailing punctuation is not left before the ellipsis");
    const written = "s".repeat(500);
    assert.ok(blogExcerpt(written, "body").length <= 181, "a written summary is cut as well");
});

test("reading time counts words, not Markdown marks, and is at least a minute", () => {
    assert.equal(readingMinutes(""), 1);
    assert.equal(readingMinutes("Short."), 1);
    assert.equal(readingMinutes("word ".repeat(200)), 1);
    assert.equal(readingMinutes("word ".repeat(450)), 2);
    assert.equal(readingMinutes("# Title\n- **one** two\n".repeat(150)), 2, "marks such as #, - and ** are not words");
});
