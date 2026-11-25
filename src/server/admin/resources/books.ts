import type { Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { httpsUrl, imageRef, optionalInt, parseRepeat, statusFromLabel, statusLabels } from "./helpers";

const include = { links: { orderBy: { id: "asc" } } } satisfies Prisma.BookInclude;
type BookRow = Prisma.BookGetPayload<{ include: typeof include }>;

const linkSchema = z.object({
    format: z.enum(["Print", "Digital"], { error: "Choose Print or Digital." }),
    retailer: z.string().trim().min(1, "Enter the retailer name.").max(100),
    url: httpsUrl,
});

const bookSchema = z.object({
    title: z.string().trim().min(2, "Enter the title.").max(300),
    language: z.string().trim().min(1, "Choose a language.").max(40),
    publisher: z.string().trim().max(200).default(""),
    imageUrl: imageRef.default(""),
    imageWidth: optionalInt(1, 10_000).default(null),
    imageHeight: optionalInt(1, 10_000).default(null),
    status: z.string().default("Draft"),
    sortOrder: optionalInt(0, 100_000).default(null),
    links: z.unknown().default(""),
});

export function toBookRow(book: BookRow): Row {
    return {
        id: book.id,
        title: book.title,
        language: book.language,
        publisher: book.publisher ?? "",
        imageUrl: book.imageUrl,
        imageWidth: book.imageWidth,
        imageHeight: book.imageHeight,
        status: statusLabels[book.status],
        sortOrder: book.sortOrder,
        linkCount: book.links.length,
        links: JSON.stringify(book.links.map((l) => ({ format: l.format, retailer: l.retailer, url: l.url }))),
        updatedOn: book.updatedAt.toISOString().slice(0, 10),
    };
}

async function load(id: string) {
    const book = await prisma.book.findUnique({ where: { id }, include });
    if (!book) throw new NotFound();
    return book;
}

function baseWhere(query: ListQuery): Prisma.BookWhereInput[] {
    const and: Prisma.BookWhereInput[] = [];
    if (query.q) and.push({ OR: [{ title: { contains: query.q } }, { publisher: { contains: query.q } }] });
    if (query.filters.language) and.push({ language: query.filters.language });
    return and;
}

async function list(query: ListQuery): Promise<ListResult> {
    const base = baseWhere(query);
    const status = query.tab ? statusFromLabel(query.tab) : undefined;
    const where: Prisma.BookWhereInput = { AND: [...base, ...(status ? [{ status }] : [])] };
    const dir = query.sort?.dir ?? "asc";
    const orderBy: Prisma.BookOrderByWithRelationInput[] = query.sort?.key === "title" ? [{ title: dir }] : query.sort?.key === "updatedOn" ? [{ updatedAt: dir }] : [{ sortOrder: "asc" }, { title: "asc" }];
    const [rows, total, grouped] = await Promise.all([
        prisma.book.findMany({ where, include, orderBy, skip: query.skip, take: query.take }),
        prisma.book.count({ where }),
        prisma.book.groupBy({ by: ["status"], where: { AND: base }, _count: { _all: true } }),
    ]);
    const tabCounts: Record<string, number> = { Published: 0, Draft: 0, Archived: 0 };
    for (const row of grouped) tabCounts[statusLabels[row.status]] = row._count._all;
    return { rows: rows.map(toBookRow), total, tabCounts };
}

function parse(input: unknown) {
    const parsed = parseWith(bookSchema, input);
    const status = statusFromLabel(parsed.status);
    if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
    return { parsed, status, links: parseRepeat(parsed.links, linkSchema, 10, "links") };
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const { parsed, status, links } = parse(input);
    const book = await prisma.book.create({
        data: {
            title: parsed.title, language: parsed.language, publisher: parsed.publisher || null, imageUrl: parsed.imageUrl,
            imageWidth: parsed.imageWidth ?? 600, imageHeight: parsed.imageHeight ?? 840, status, sortOrder: parsed.sortOrder ?? 0,
            links: { create: links },
        },
    });
    await writeAudit({ actorId: ctx.user.id, action: "book.create", entity: "Book", entityId: book.id, after: { title: book.title, status }, ip: ctx.ip });
    return toBookRow(await load(book.id));
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const { parsed, status, links } = parse(input);
    await prisma.$transaction([
        prisma.bookLink.deleteMany({ where: { bookId: id } }),
        prisma.book.update({
            where: { id },
            data: {
                title: parsed.title, language: parsed.language, publisher: parsed.publisher || null, imageUrl: parsed.imageUrl,
                imageWidth: parsed.imageWidth ?? existing.imageWidth, imageHeight: parsed.imageHeight ?? existing.imageHeight,
                status, sortOrder: parsed.sortOrder ?? existing.sortOrder, links: { create: links },
            },
        }),
    ]);
    await writeAudit({ actorId: ctx.user.id, action: existing.status !== status ? "book.status" : "book.update", entity: "Book", entityId: id, before: { title: existing.title, status: existing.status }, after: { title: parsed.title, status }, ip: ctx.ip });
    return toBookRow(await load(id));
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    await load(id);
    const book = await prisma.book.update({ where: { id }, data: { status: "ARCHIVED" }, include });
    await writeAudit({ actorId: ctx.user.id, action: "book.archive", entity: "Book", entityId: id, ip: ctx.ip });
    return toBookRow(book);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    await prisma.book.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "book.delete", entity: "Book", entityId: id, before: { title: existing.title }, ip: ctx.ip });
}

export const bookResource: ResourceDef = {
    key: "website/books",
    resource: "siteContent",
    sortableKeys: ["title", "updatedOn"],
    list,
    get: async (id) => toBookRow(await load(id)),
    create,
    update,
    remove,
    actions: { archive },
};
