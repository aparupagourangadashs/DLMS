"use client";

import { useEffect } from "react";

/** Reports one view of the article. A tab counts it once, and the server ignores a visitor's repeats within the hour. */
export function BlogViewCounter({ slug }: { slug: string }) {
    useEffect(() => {
        const key = `blog-viewed:${slug}`;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, "1");
        } catch {
            // Storage can be blocked; the server's limit still applies.
        }
        fetch(`/api/public/blogs/${encodeURIComponent(slug)}/views`, { method: "POST", keepalive: true }).catch(() => undefined);
    }, [slug]);
    return null;
}
