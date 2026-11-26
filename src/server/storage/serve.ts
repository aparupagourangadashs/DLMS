import { Readable } from "node:stream";
import { getStorage } from "./index";

type Served = {
    key: string;
    size: number;
    mime: string;
    fileName: string;
    /** Show in the browser; otherwise the browser saves the file. */
    inline: boolean;
    /** Lets browsers and proxies keep the file; set only for files anyone may fetch. */
    publicCache?: { etag: string };
};

/** `bytes=a-b`, `bytes=a-` or `bytes=-n` for a file of `size` bytes; null when the header is not a single satisfiable range. */
export function parseRange(header: string, size: number): { start: number; end: number } | "unsatisfiable" | null {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match || (match[1] === "" && match[2] === "")) return null;
    let start: number;
    let end: number;
    if (match[1] === "") {
        const suffix = Number(match[2]);
        if (suffix === 0) return "unsatisfiable";
        start = Math.max(0, size - suffix);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    }
    if (start >= size || start > end) return "unsatisfiable";
    return { start, end };
}

/** `attachment; filename="..."; filename*=UTF-8''...` that survives any file name. */
function disposition(kind: "inline" | "attachment", fileName: string) {
    const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** Streams a stored file with Range support, so audio and video can seek. */
export function fileResponse(request: Request, file: Served): Response {
    const headers = new Headers({
        "Content-Type": file.mime,
        "Accept-Ranges": "bytes",
        "Content-Disposition": disposition(file.inline ? "inline" : "attachment", file.fileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": file.publicCache ? "public, max-age=3600" : "private, no-store",
    });
    if (file.publicCache) {
        headers.set("ETag", `"${file.publicCache.etag}"`);
        if (request.headers.get("if-none-match") === `"${file.publicCache.etag}"`) return new Response(null, { status: 304, headers });
    }

    const requested = request.headers.get("range");
    const range = requested ? parseRange(requested, file.size) : null;
    if (range === "unsatisfiable") {
        headers.set("Content-Range", `bytes */${file.size}`);
        return new Response(null, { status: 416, headers });
    }
    if (request.method === "HEAD") {
        headers.set("Content-Length", String(file.size));
        return new Response(null, { status: 200, headers });
    }
    const stream = Readable.toWeb(getStorage().open(file.key, range ?? undefined)) as ReadableStream;
    if (range) {
        headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.size}`);
        headers.set("Content-Length", String(range.end - range.start + 1));
        return new Response(stream, { status: 206, headers });
    }
    headers.set("Content-Length", String(file.size));
    return new Response(stream, { status: 200, headers });
}
