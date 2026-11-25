/** The 11-character id of a YouTube video from a watch, short, live, embed or youtu.be address; null for anything else. */
export function youtubeId(address: string): string | null {
    let url: URL;
    try {
        url = new URL(address.trim());
    } catch {
        return null;
    }
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^(www|m)\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") id = url.searchParams.get("v");
        else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** The privacy-friendly embed address for a video id. */
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
