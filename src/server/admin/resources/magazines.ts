import type { Magazine, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { contentResource } from "./content";
import { dateOnly, imageRef, isoDay, optionalHttpsUrl, optionalInt, statusFromLabel, statusLabels } from "./helpers";

const schema = z.object({
    title: z.string().trim().min(2, "Enter the issue title.").max(300),
    issueLabel: z.string().trim().max(100).default(""),
    issueDate: dateOnly.default(null),
    language: z.string().trim().min(1, "Choose a language.").max(40),
    coverUrl: imageRef.default(""),
    fileUrl: optionalHttpsUrl.default(""),
    status: z.string().default("Draft"),
    sortOrder: optionalInt(0, 100_000).default(null),
});

export const magazineResource = contentResource<
    Magazine,
    Prisma.MagazineWhereInput,
    Prisma.MagazineOrderByWithRelationInput[],
    Prisma.MagazineUncheckedCreateInput
>({
    key: "website/magazines",
    resource: "siteContent",
    entity: "magazine",
    sortableKeys: ["title", "issueDate"],
    find: (args) => prisma.magazine.findMany(args),
    count: (where) => prisma.magazine.count({ where }),
    counts: async (where) => (await prisma.magazine.groupBy({ by: ["status"], where, _count: { _all: true } })).map((r) => ({ status: r.status, _count: { _all: r._count._all } })),
    get: (id) => prisma.magazine.findUnique({ where: { id } }),
    create: (data) => prisma.magazine.create({ data }),
    update: (id, data) => prisma.magazine.update({ where: { id }, data }),
    setStatus: (id, status) => prisma.magazine.update({ where: { id }, data: { status } }),
    remove: async (id) => { await prisma.magazine.delete({ where: { id } }); },
    filters: (query) => (query.q ? [{ OR: [{ title: { contains: query.q } }, { issueLabel: { contains: query.q } }] }] : []),
    withStatus: (status) => ({ status }),
    and: (parts) => ({ AND: parts }),
    orderBy: (query) => {
        const dir = query.sort?.dir ?? "desc";
        return query.sort?.key === "title" ? [{ title: dir }] : [{ issueDate: dir }, { sortOrder: "asc" }];
    },
    parse: (input, existing) => {
        const parsed = parseWith(schema, input);
        const status = statusFromLabel(parsed.status);
        if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
        return {
            status,
            data: {
                title: parsed.title, issueLabel: parsed.issueLabel || null, issueDate: parsed.issueDate, language: parsed.language,
                coverUrl: parsed.coverUrl || null, fileUrl: parsed.fileUrl || null, status, sortOrder: parsed.sortOrder ?? existing?.sortOrder ?? 0,
            },
        };
    },
    toRow: (m) => ({
        id: m.id, title: m.title, issueLabel: m.issueLabel ?? "", issueDate: isoDay(m.issueDate), language: m.language,
        coverUrl: m.coverUrl ?? "", fileUrl: m.fileUrl ?? "", status: statusLabels[m.status], sortOrder: m.sortOrder,
    }),
    label: (m) => m.title,
});
