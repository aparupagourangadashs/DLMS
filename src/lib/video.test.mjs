import assert from "node:assert/strict";
import test from "node:test";
import { youtubeEmbedUrl, youtubeId } from "./video.ts";

test("youtubeId reads the common YouTube address shapes", () => {
    const id = "dQw4w9WgXcQ";
    for (const address of [
        `https://www.youtube.com/watch?v=${id}`,
        `https://youtube.com/watch?v=${id}&t=42s`,
        `https://m.youtube.com/watch?v=${id}`,
        `https://youtu.be/${id}`,
        `https://youtu.be/${id}?si=abc`,
        `https://www.youtube.com/embed/${id}`,
        `https://www.youtube-nocookie.com/embed/${id}`,
        `https://www.youtube.com/shorts/${id}`,
        `https://www.youtube.com/live/${id}`,
        `  https://youtu.be/${id}  `,
    ]) assert.equal(youtubeId(address), id, address);
});

test("youtubeId refuses anything that is not a plain https YouTube video", () => {
    for (const address of [
        "",
        "not a url",
        "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch",
        "https://www.youtube.com/watch?v=short",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload",
        "https://www.youtube.com/playlist?list=PL12345678901",
        "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
        "https://evil.example/https://youtu.be/dQw4w9WgXcQ",
        "https://vimeo.com/123456789",
        "javascript:alert(1)",
    ]) assert.equal(youtubeId(address), null, address);
});

test("youtubeEmbedUrl uses the no-cookie embed host", () => {
    assert.equal(youtubeEmbedUrl("dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
});
