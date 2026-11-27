import type { Person, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { contentResource } from "./content";
import { imageRef, optionalInt, statusFromLabel, statusLabels } from "./helpers";
import { claimImage, uploadedId } from "@/server/services/assets";

const groupLabels = { ADVISORY: "Advisory Board", TEAM: "Team" } as const;

const schema = z.object({
    name: z.string().trim().min(2, "Enter the name.").max(120),
    roleTitle: z.string().trim().min(2, "Enter the role or title.").max(160),
    group: z.enum(["Advisory Board", "Team"], { error: "Choose Advisory Board or Team." }),
    bio: z.string().trim().max(3000).default(""),
    imageUrl: z.string().default(""),
    status: z.string().default("Draft"),
    sortOrder: optionalInt(0, 100_000).default(null),
});

export const peopleResource = contentResource<
    Person,
    Prisma.PersonWhereInput,
    Prisma.PersonOrderByWithRelationInput[],
    Prisma.PersonUncheckedCreateInput
>({
    key: "website/people",
    resource: "siteContent",
    entity: "person",
    sortableKeys: ["name", "updatedOn"],
    find: (args) => prisma.person.findMany(args),
    count: (where) => prisma.person.count({ where }),
    counts: async (where) => (await prisma.person.groupBy({ by: ["status"], where, _count: { _all: true } })).map((r) => ({ status: r.status, _count: { _all: r._count._all } })),
    get: (id) => prisma.person.findUnique({ where: { id } }),
    create: (data) => prisma.person.create({ data }),
    update: (id, data) => prisma.person.update({ where: { id }, data }),
    setStatus: (id, status) => prisma.person.update({ where: { id }, data: { status } }),
    remove: async (id) => { await prisma.person.delete({ where: { id } }); },
    filters: (query) => {
        const and: Prisma.PersonWhereInput[] = [];
        if (query.q) and.push({ OR: [{ name: { contains: query.q } }, { roleTitle: { contains: query.q } }] });
        if (query.filters.group) and.push({ group: query.filters.group === "Team" ? "TEAM" : "ADVISORY" });
        return and;
    },
    withStatus: (status) => ({ status }),
    and: (parts) => ({ AND: parts }),
    orderBy: (query) => {
        const dir = query.sort?.dir ?? "asc";
        return query.sort?.key === "name" ? [{ name: dir }] : query.sort?.key === "updatedOn" ? [{ updatedAt: dir }] : [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }];
    },
    parse: async (input, existing, ctx) => {
        const parsed = parseWith(schema, input);
        const status = statusFromLabel(parsed.status);
        if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
        let imageUrl = parsed.imageUrl;
        if (ctx && uploadedId(imageUrl)) {
            const current = /^\/api\/assets\/([^/]+)\/file$/.exec(existing?.imageUrl ?? "")?.[1];
            const assetId = await claimImage(imageUrl, { name: parsed.name, actorId: ctx.user.id, field: "imageUrl", current, maxBytes: 5 * 1024 * 1024 });
            imageUrl = assetId ? `/api/assets/${assetId}/file` : existing?.imageUrl ?? "";
        } else if (imageUrl && !imageRef.safeParse(imageUrl).success) {
            throw new ValidationError({ imageUrl: "Use a site path or an https:// image URL, or choose an Asset Library image." });
        }
        return {
            status,
            data: {
                name: parsed.name, roleTitle: parsed.roleTitle, group: parsed.group === "Team" ? "TEAM" : "ADVISORY",
                bio: parsed.bio || null, imageUrl: imageUrl || null, status, sortOrder: parsed.sortOrder ?? existing?.sortOrder ?? 0,
            },
        };
    },
    toRow: (p) => {
        const assetMatch = /^\/api\/assets\/([^/]+)\/file$/.exec(p.imageUrl ?? "");
        const image = assetMatch ? JSON.stringify({ id: assetMatch[1], name: "Person photo", size: 0 }) : p.imageUrl ?? "";
        return {
            id: p.id, name: p.name, roleTitle: p.roleTitle, group: groupLabels[p.group], bio: p.bio ?? "", imageUrl: image,
            status: statusLabels[p.status], sortOrder: p.sortOrder, updatedOn: p.updatedAt.toISOString().slice(0, 10),
        };
    },
    label: (p) => p.name,
});
