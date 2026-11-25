import type { Prisma, Video } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { contentResource } from "./content";
import { imageRef, optionalInt, statusFromLabel, statusLabels } from "./helpers";

/** Accepts a bare 11-character id or a youtube.com / youtu.be link and returns the id. */
export function youtubeIdFrom(value: string) {
    const text = value.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
    try {
        const url = new URL(text);
        const host = url.hostname.replace(/^www\./, "");
        const id = host === "youtu.be" ? url.pathname.slice(1) : host === "youtube.com" || host === "youtube-nocookie.com" ? url.searchParams.get("v") ?? url.pathname.split("/").pop() ?? "" : "";
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
        return null;
    }
}

const schema = z.object({
    youtubeId: z.string().trim().min(1, "Paste the YouTube link or video id."),
    speaker: z.string().trim().min(2, "Enter the speaker.").max(150),
    title: z.string().trim().min(2, "Enter the title.").max(300),
    thumbnailUrl: imageRef.default(""),
    status: z.string().default("Draft"),
    sortOrder: optionalInt(0, 100_000).default(null),
});

export const videoResource = contentResource<
    Video,
    Prisma.VideoWhereInput,
    Prisma.VideoOrderByWithRelationInput[],
    Prisma.VideoUncheckedCreateInput
>({
    key: "website/videos",
    resource: "siteContent",
    entity: "video",
    sortableKeys: ["title", "updatedOn"],
    find: (args) => prisma.video.findMany(args),
    count: (where) => prisma.video.count({ where }),
    counts: async (where) => (await prisma.video.groupBy({ by: ["status"], where, _count: { _all: true } })).map((r) => ({ status: r.status, _count: { _all: r._count._all } })),
    get: (id) => prisma.video.findUnique({ where: { id } }),
    create: (data) => prisma.video.create({ data }),
    update: (id, data) => prisma.video.update({ where: { id }, data }),
    setStatus: (id, status) => prisma.video.update({ where: { id }, data: { status } }),
    remove: async (id) => { await prisma.video.delete({ where: { id } }); },
    filters: (query) => (query.q ? [{ OR: [{ title: { contains: query.q } }, { speaker: { contains: query.q } }] }] : []),
    withStatus: (status) => ({ status }),
    and: (parts) => ({ AND: parts }),
    orderBy: (query) => {
        const dir = query.sort?.dir ?? "asc";
        return query.sort?.key === "title" ? [{ title: dir }] : query.sort?.key === "updatedOn" ? [{ updatedAt: dir }] : [{ sortOrder: "asc" }, { createdAt: "asc" }];
    },
    parse: (input, existing) => {
        const parsed = parseWith(schema, input);
        const youtubeId = youtubeIdFrom(parsed.youtubeId);
        if (!youtubeId) throw new ValidationError({ youtubeId: "Use a YouTube link or an 11-character video id." });
        const status = statusFromLabel(parsed.status);
        if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
        return {
            status,
            data: { youtubeId, speaker: parsed.speaker, title: parsed.title, thumbnailUrl: parsed.thumbnailUrl, status, sortOrder: parsed.sortOrder ?? existing?.sortOrder ?? 0 },
        };
    },
    toRow: (v) => ({
        id: v.id, title: v.title, speaker: v.speaker, youtubeId: v.youtubeId, thumbnailUrl: v.thumbnailUrl,
        status: statusLabels[v.status], sortOrder: v.sortOrder, updatedOn: v.updatedAt.toISOString().slice(0, 10),
    }),
    label: (v) => v.title,
});
