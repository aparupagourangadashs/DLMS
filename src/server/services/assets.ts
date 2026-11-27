import type { AssetType, Prisma } from "@/generated/prisma/client";
import { assetExtensions, formatBytes, isLinkType, type AssetTypeLabel, type UploadedFile } from "@/lib/admin/assets";
import { prisma } from "@/server/db";
import { AppError, ValidationError } from "@/server/http/errors";
import { getStorage, newStorageKey } from "@/server/storage";
import crypto from "node:crypto";
import path from "node:path";

const TYPE_BY_LABEL: Record<AssetTypeLabel, AssetType> = {
    Video: "VIDEO",
    Audio: "AUDIO",
    PDF: "PDF",
    YouTube: "YOUTUBE",
    Image: "IMAGE",
    Doc: "DOC",
    Sheet: "SHEET",
    Slide: "SLIDE",
    "Text/HTML": "TEXT_HTML",
    Zip: "ZIP",
    "SCORM Zip": "SCORM_ZIP",
    "Link/Embed": "LINK",
    Epub: "EPUB",
};
const LABEL_BY_TYPE = Object.fromEntries(Object.entries(TYPE_BY_LABEL).map(([label, type]) => [type, label])) as Record<AssetType, AssetTypeLabel>;

export const assetTypeFromLabel = (label: string): AssetType | undefined => (TYPE_BY_LABEL as Record<string, AssetType | undefined>)[label];
export const assetLabel = (type: AssetType) => LABEL_BY_TYPE[type];

// The type a file is stored under comes from its extension, never from what the browser claims.
const MIME: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".html": "text/html",
    ".zip": "application/zip",
    ".epub": "application/epub+zip",
};

// Capped at 30 MB: the proxy in front of /api/admin buffers up to 32 MB (see next.config.ts).
export const maxUploadBytes = () => Math.min(30, Math.max(1, Number(process.env.UPLOAD_MAX_MB) || 25)) * 1024 * 1024;

const startsWith = (head: Uint8Array, bytes: number[], offset = 0) => bytes.every((byte, i) => head[offset + i] === byte);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** Whether the first bytes of a file match what its extension claims. */
function matchesContent(ext: string, head: Uint8Array) {
    switch (ext) {
        case ".png":
            return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        case ".jpg":
        case ".jpeg":
            return startsWith(head, [0xff, 0xd8, 0xff]);
        case ".webp":
            return startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8);
        case ".pdf":
            return startsWith(head, ascii("%PDF-"));
        case ".mp4":
            return startsWith(head, ascii("ftyp"), 4);
        case ".webm":
            return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]);
        case ".mp3":
            return startsWith(head, ascii("ID3")) || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
        case ".wav":
            return startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WAVE"), 8);
        case ".ogg":
            return startsWith(head, ascii("OggS"));
        case ".zip":
        case ".docx":
        case ".xlsx":
        case ".pptx":
        case ".epub":
            return startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06]);
        case ".doc":
        case ".xls":
        case ".ppt":
            return startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
        case ".csv":
        case ".txt":
        case ".html":
            return !head.includes(0);
        default:
            return false;
    }
}

const invalidFile = (message: string) => new AppError(400, "INVALID_FILE", message);

function safeFileName(name: string) {
    const base = path.basename(name.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").trim();
    const ext = path.extname(base);
    return base.length > 255 ? `${base.slice(0, 255 - ext.length)}${ext}` : base;
}

/** Stores an uploaded file and records it as a STAGED asset; the Asset Library form later makes it READY. */
export async function uploadAsset(input: { file: File; type: string }, actor: { id: string }): Promise<UploadedFile> {
    const label = input.type;
    const extensions = assetExtensions[label];
    if (!extensions || isLinkType(label)) throw invalidFile("Choose a file type first. YouTube and link assets have no file.");
    const fileName = safeFileName(input.file.name);
    const ext = path.extname(fileName).toLowerCase();
    if (!extensions.includes(ext)) throw invalidFile(`A ${label} asset must be ${extensions.join(", ")}.`);
    if (input.file.size === 0) throw invalidFile("This file is empty.");
    if (input.file.size > maxUploadBytes()) throw new AppError(413, "TOO_LARGE", `Files can be up to ${Math.round(maxUploadBytes() / 1_048_576)} MB.`);

    const bytes = Buffer.from(await input.file.arrayBuffer());
    if (!matchesContent(ext, bytes.subarray(0, 4096))) throw invalidFile(`This does not look like a real ${ext} file.`);

    await purgeStaged();
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const twin = await prisma.asset.findFirst({ where: { sha256, sizeBytes: bytes.length, storageKey: { not: null } }, select: { storageKey: true } });
    let key = twin?.storageKey ?? null;
    const wrote = key === null;
    if (!key) {
        key = newStorageKey();
        await getStorage().put(key, bytes);
    }
    try {
        const asset = await prisma.asset.create({
            data: {
                type: TYPE_BY_LABEL[label as AssetTypeLabel],
                name: path.basename(fileName, ext).slice(0, 200) || "Untitled",
                fileName,
                storageKey: key,
                mimeType: MIME[ext],
                sizeBytes: bytes.length,
                sha256,
                uploadedById: actor.id,
            },
        });
        return { id: asset.id, name: fileName, size: bytes.length };
    } catch (error) {
        if (wrote) await getStorage().remove(key);
        throw error;
    }
}

/** The asset id a file field holds (`{ id, name, size }` as JSON), or "" when it holds none. */
export function uploadedId(value: string) {
    if (!value.trim()) return "";
    try {
        const parsed = JSON.parse(value) as { id?: unknown };
        return typeof parsed.id === "string" ? parsed.id : "";
    } catch {
        return "";
    }
}

/**
 * The asset an image field means: a new upload by this staff member, which is saved under `name`, or the asset the record already has.
 * Null when the field is empty.
 */
export async function claimImage(value: string, options: { name: string; actorId: string; field: string; current?: string | null; maxBytes?: number }) {
    const id = uploadedId(value);
    if (!id) return null;
    if (id === options.current) return id;
    const staged = await prisma.asset.findFirst({ where: { id, status: "STAGED", type: "IMAGE", uploadedById: options.actorId } });
    if (!staged) throw new ValidationError({ [options.field]: "This upload expired. Choose the image again." });
    if (options.maxBytes && (staged.sizeBytes ?? 0) > options.maxBytes) throw new ValidationError({ [options.field]: `Images can be up to ${Math.round(options.maxBytes / 1_048_576)} MB.` });
    await prisma.asset.update({ where: { id }, data: { status: "READY", name: options.name.slice(0, 200) } });
    return id;
}

/** Deletes a stored file once no asset points at it any more. */
export async function releaseFile(key: string | null) {
    if (key && (await prisma.asset.count({ where: { storageKey: key } })) === 0) await getStorage().remove(key);
}

/** Removes uploads that were never saved from their form. */
export async function purgeStaged(now = new Date(), maxAgeMs = 24 * 3_600_000) {
    const stale = await prisma.asset.findMany({ where: { status: "STAGED", createdAt: { lt: new Date(now.getTime() - maxAgeMs) } }, select: { id: true, storageKey: true }, take: 100 });
    for (const asset of stale) {
        await prisma.asset.delete({ where: { id: asset.id } });
        await releaseFile(asset.storageKey);
    }
}

/** Places an asset can be used: lessons, banners, events and article covers. */
export const usedAssets: Prisma.AssetWhereInput = { OR: [{ lessons: { some: {} } }, { banners: { some: {} } }, { events: { some: {} } }, { blogs: { some: {} } }] };
export const unusedAssets: Prisma.AssetWhereInput = { lessons: { none: {} }, banners: { none: {} }, events: { none: {} }, blogs: { none: {} } };

/** How many places use each asset; an asset in use cannot be deleted. */
export async function assetUsage(ids: string[]): Promise<Map<string, number>> {
    const usage = new Map<string, number>(ids.map((id) => [id, 0]));
    if (ids.length === 0) return usage;
    const [lessons, banners, events, blogs, courses, books, people] = await Promise.all([
        prisma.moduleContent.groupBy({ by: ["assetId"], where: { assetId: { in: ids } }, _count: { _all: true } }),
        prisma.banner.groupBy({ by: ["imageAssetId"], where: { imageAssetId: { in: ids } }, _count: { _all: true } }),
        prisma.event.groupBy({ by: ["imageAssetId"], where: { imageAssetId: { in: ids } }, _count: { _all: true } }),
        prisma.blog.groupBy({ by: ["coverAssetId"], where: { coverAssetId: { in: ids } }, _count: { _all: true } }),
        prisma.course.findMany({ where: { imageUrl: { contains: "/api/assets/" } }, select: { imageUrl: true } }),
        prisma.book.findMany({ where: { imageUrl: { contains: "/api/assets/" } }, select: { imageUrl: true } }),
        prisma.person.findMany({ where: { imageUrl: { contains: "/api/assets/" } }, select: { imageUrl: true } }),
    ]);
    const add = (id: string | null, count: number) => {
        if (id) usage.set(id, (usage.get(id) ?? 0) + count);
    };
    for (const g of lessons) add(g.assetId, g._count._all);
    for (const g of banners) add(g.imageAssetId, g._count._all);
    for (const g of events) add(g.imageAssetId, g._count._all);
    for (const g of blogs) add(g.coverAssetId, g._count._all);
    for (const row of [...courses, ...books, ...people]) {
        const match = /^\/api\/assets\/([^/]+)\/file$/.exec(row.imageUrl ?? "");
        if (match) usage.set(match[1], (usage.get(match[1]) ?? 0) + 1);
    }
    return usage;
}

/** Only images are public: they appear on the website. Everything else needs a staff session or a lesson that uses it. */
export const isPublicAsset = (type: AssetType) => type === "IMAGE";
const INLINE_TYPES: AssetType[] = ["IMAGE", "PDF", "AUDIO", "VIDEO"];
export const showsInline = (type: AssetType) => INLINE_TYPES.includes(type);

/** How the course player shows a file: played or viewed in the page, or offered as a download. */
export function fileKind(type: AssetType): "pdf" | "audio" | "video" | "image" | "download" {
    return type === "PDF" ? "pdf" : type === "AUDIO" ? "audio" : type === "VIDEO" ? "video" : type === "IMAGE" ? "image" : "download";
}

/**
 * Files a lesson can use, newest first, each with a label that identifies exactly one asset.
 * `include` adds assets that may be older than the newest 500, such as those a module already uses.
 */
export async function fileAssetChoices(include: string[] = []) {
    const select = { id: true, name: true, type: true, fileName: true } as const;
    const [recent, pinned] = await Promise.all([
        prisma.asset.findMany({ where: { status: "READY", storageKey: { not: null } }, orderBy: { createdAt: "desc" }, take: 500, select }),
        include.length ? prisma.asset.findMany({ where: { id: { in: include } }, select }) : [],
    ]);
    const assets = [...recent, ...pinned.filter((p) => !recent.some((r) => r.id === p.id))];
    const base = (a: (typeof assets)[number]) => `${a.name} (${assetLabel(a.type)})`;
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(base(a), (counts.get(base(a)) ?? 0) + 1);
    const seen = new Map<string, number>();
    return assets.map((a) => {
        const label = (counts.get(base(a)) ?? 0) > 1 ? `${base(a)} \u2013 ${a.fileName ?? "file"}` : base(a);
        const n = (seen.get(label) ?? 0) + 1;
        seen.set(label, n);
        return { id: a.id, label: n === 1 ? label : `${label} (${n})` };
    });
}

/** A READY asset that has a stored file. */
export async function findStoredAsset(id: string) {
    const asset = await prisma.asset.findFirst({ where: { id, status: "READY", storageKey: { not: null }, sizeBytes: { not: null } } });
    return asset && asset.storageKey && asset.sizeBytes !== null ? { ...asset, storageKey: asset.storageKey, sizeBytes: asset.sizeBytes } : null;
}

export async function recordDownload(id: string) {
    await prisma.asset.update({ where: { id }, data: { downloads: { increment: 1 } } });
}

export async function assetSummary() {
    const [total, unused, files, largest] = await Promise.all([
        prisma.asset.count({ where: { status: "READY" } }),
        prisma.asset.count({ where: { status: "READY", ...unusedAssets } }),
        prisma.asset.groupBy({ by: ["storageKey"], where: { status: "READY", storageKey: { not: null } }, _sum: { sizeBytes: true }, _max: { sizeBytes: true } }),
        prisma.asset.findFirst({ where: { status: "READY", sizeBytes: { not: null } }, orderBy: { sizeBytes: "desc" }, select: { name: true, sizeBytes: true } }),
    ]);
    const stored = files.reduce((sum, g) => sum + (g._max.sizeBytes ?? 0), 0);
    const saved = files.reduce((sum, g) => sum + (g._sum.sizeBytes ?? 0) - (g._max.sizeBytes ?? 0), 0);
    return [
        { label: "Total assets", value: String(total) },
        { label: "Storage used", value: formatBytes(stored), hint: `${files.length} stored ${files.length === 1 ? "file" : "files"}` },
        { label: "Unused assets", value: String(unused), ...(unused > 0 ? { tone: "warning" as const } : {}) },
        { label: "Storage saved", value: formatBytes(saved), hint: "via de-duplication", ...(saved > 0 ? { tone: "success" as const } : {}) },
        { label: "Largest asset", value: largest?.sizeBytes ? formatBytes(largest.sizeBytes) : "—", ...(largest ? { hint: largest.name } : {}) },
    ];
}
