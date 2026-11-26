import type { BlogStatus, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import { istDayRange, toIst } from "@/lib/ist";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { claimImage } from "@/server/services/assets";
import { idByLabel, labelMap, staffOptions } from "@/server/services/lookups";
import { z } from "zod";
import { slugify } from "./helpers";

const statusLabels: Record<BlogStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", HIDDEN: "Hidden" };
const statusFromLabel = (label: string) => (Object.keys(statusLabels) as BlogStatus[]).find((key) => statusLabels[key] === label);

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const SLUG_MAX = 150;

const schema = z.object({
    name: z.string().trim().min(3, "Enter the title.").max(200),
    slug: z.string().trim().max(SLUG_MAX).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and single hyphens.").default(""),
    summary: z.string().trim().max(400, "Keep the summary under 400 characters.").default(""),
    cover: z.string().default(""),
    author: z.string().trim().default(""),
    status: z.string().default("Draft"),
    body: z.string().trim().min(10, "Write the article.").max(100_000, "The article is too long."),
});

const include = {
    author: { select: { staffProfile: { select: { displayName: true } } } },
    cover: { select: { name: true, fileName: true, sizeBytes: true } },
} satisfies Prisma.BlogInclude;
type BlogRow = Prisma.BlogGetPayload<{ include: typeof include }>;
// List rows leave the article text out; the editor loads it with `get`.
type ListedBlog = Omit<BlogRow, "body"> & { body?: string };

function toRow(blog: ListedBlog, labels: Map<string, string>): Row {
    return {
        id: blog.id,
        name: blog.title,
        slug: blog.slug,
        summary: blog.summary ?? "",
        ...(blog.body === undefined ? {} : { body: blog.body }),
        cover: blog.coverAssetId ? JSON.stringify({ id: blog.coverAssetId, name: blog.cover?.fileName ?? blog.cover?.name ?? "", size: blog.cover?.sizeBytes ?? 0 }) : "",
        thumbnail: blog.coverAssetId ? `/api/assets/${blog.coverAssetId}/file` : "",
        // The form's value must match an option; a departed author is blank here and keeps their byline.
        author: blog.authorId ? labels.get(blog.authorId) ?? "" : "",
        byline: blog.author?.staffProfile?.displayName ?? "",
        status: statusLabels[blog.status],
        views: blog.views,
        publishedOn: blog.publishedAt ? toIst(blog.publishedAt).date : "",
        createdOn: toIst(blog.createdAt).date,
    };
}

const present = async (blog: BlogRow) => toRow(blog, labelMap(await staffOptions()));

function filters(query: ListQuery): Prisma.BlogWhereInput[] {
    const and: Prisma.BlogWhereInput[] = [];
    if (query.q) and.push({ OR: [{ title: { contains: query.q } }, { summary: { contains: query.q } }, { slug: { contains: query.q } }] });
    if (query.filters.status) {
        const status = statusFromLabel(query.filters.status);
        and.push(status ? { status } : { id: "none" });
    }
    if (query.from) and.push({ createdAt: { gte: istDayRange(query.from).start } });
    if (query.to) and.push({ createdAt: { lt: istDayRange(query.to).end } });
    return and;
}

async function list(query: ListQuery): Promise<ListResult> {
    const where: Prisma.BlogWhereInput = { AND: filters(query) };
    const dir = query.sort?.dir ?? "desc";
    const orderBy: Prisma.BlogOrderByWithRelationInput[] =
        query.sort?.key === "name" ? [{ title: dir }]
            : query.sort?.key === "views" ? [{ views: dir }, { createdAt: "desc" }]
                : query.sort?.key === "publishedOn" ? [{ publishedAt: dir }, { createdAt: "desc" }]
                    : [{ createdAt: dir }];
    const [rows, total, staff] = await Promise.all([
        prisma.blog.findMany({ where, include, omit: { body: true }, orderBy, skip: query.skip, take: query.take }),
        prisma.blog.count({ where }),
        staffOptions(),
    ]);
    const labels = labelMap(staff);
    return { rows: rows.map((row) => toRow(row, labels)), total };
}

async function load(id: string) {
    const blog = await prisma.blog.findUnique({ where: { id }, include });
    if (!blog) throw new NotFound();
    return blog;
}

async function uniqueSlug(base: string) {
    const root = slugify(base, SLUG_MAX - 10) || "article";
    for (let n = 1; n < 500; n += 1) {
        const candidate = n === 1 ? root : `${root}-${n}`;
        if (!(await prisma.blog.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
    }
    throw new BusinessRule("Could not create a unique web address. Enter one yourself.");
}

/** Checks the form and turns it into what is stored: the status, the author, the web address, the cover and when it was first published. */
async function resolve(data: z.output<typeof schema>, ctx: ResourceContext, existing?: BlogRow): Promise<Prisma.BlogUncheckedCreateInput> {
    const status = statusFromLabel(data.status);
    if (!status) throw new ValidationError({ status: "Choose Draft, Published or Hidden." });

    let authorId = existing?.authorId ?? ctx.user.id;
    if (data.author) {
        const chosen = idByLabel(await staffOptions(), data.author);
        if (!chosen) throw new ValidationError({ author: "Choose the author from the list." });
        authorId = chosen;
    }

    let slug = existing?.slug ?? "";
    if (data.slug && data.slug !== existing?.slug) {
        if (await prisma.blog.findUnique({ where: { slug: data.slug }, select: { id: true } })) throw new Conflict("Another article already uses this web address.", { slug: "Already in use." });
        slug = data.slug;
    } else if (!existing) {
        slug = await uniqueSlug(data.name);
    }

    const coverAssetId = await claimImage(data.cover, { name: data.name, actorId: ctx.user.id, field: "cover", current: existing?.coverAssetId, maxBytes: MAX_COVER_BYTES });
    const publishedAt = status === "PUBLISHED" && !existing?.publishedAt ? new Date() : existing?.publishedAt ?? null;
    return { slug, title: data.name, summary: data.summary || null, body: data.body, coverAssetId, authorId, status, publishedAt };
}

const statusAction = (from: BlogStatus, to: BlogStatus) =>
    to === "PUBLISHED" ? "blog.publish" : from === "PUBLISHED" ? (to === "HIDDEN" ? "blog.hide" : "blog.unpublish") : "blog.update";

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const created = await prisma.blog.create({ data: await resolve(data, ctx), include });
    await writeAudit({ actorId: ctx.user.id, action: "blog.create", entity: "Blog", entityId: created.id, after: { title: created.title, slug: created.slug, status: created.status }, ip: ctx.ip });
    return present(created);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const data = parseWith(schema, input);
    const updated = await prisma.blog.update({ where: { id }, data: await resolve(data, ctx, existing), include });
    const action = existing.status === updated.status ? "blog.update" : statusAction(existing.status, updated.status);
    await writeAudit({ actorId: ctx.user.id, action, entity: "Blog", entityId: id, before: { title: existing.title, slug: existing.slug, status: existing.status }, after: { title: updated.title, slug: updated.slug, status: updated.status }, ip: ctx.ip });
    return present(updated);
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const title = `${source.title} (copy)`.slice(0, 200);
    const copy = await prisma.blog.create({
        data: { slug: await uniqueSlug(title), title, summary: source.summary, body: source.body, coverAssetId: source.coverAssetId, authorId: source.authorId, status: "DRAFT" },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "blog.create", entity: "Blog", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return present(copy);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    if (existing.status === "PUBLISHED") throw new BusinessRule("A published article cannot be deleted. Hide it first.");
    await prisma.blog.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "blog.delete", entity: "Blog", entityId: id, before: { title: existing.title, slug: existing.slug }, ip: ctx.ip });
}

export const blogResource: ResourceDef = {
    key: "marketing/blogs",
    resource: "blogs",
    sortableKeys: ["name", "views", "publishedOn", "createdOn"],
    list,
    get: async (id) => present(await load(id)),
    options: async () => ({ author: (await staffOptions()).map((staff) => staff.label) }),
    create,
    update,
    remove,
    actions: { duplicate },
};
