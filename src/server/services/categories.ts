import type { Prisma } from "@/generated/prisma/client";
import { staticPageSlugs } from "@/lib/website/static";
import { slugify, statusFromLabel, statusLabels } from "@/server/admin/resources/helpers";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

export const categoryColors = ["plum", "teal", "gold", "rose", "blue"] as const;
// Top-level slugs become /website/<slug>, so they must not shadow fixed pages.
const reservedSlugs = new Set<string>([...staticPageSlugs, "course"]);

export type CategoryDto = {
    id: string;
    slug: string;
    title: string;
    shortLabel: string;
    description: string;
    color: string;
    sortOrder: number;
    status: string;
    courseCount: number;
    parentId: string | null;
    children: CategoryDto[];
};

type Actor = { id: string; ip: string };

const include = { _count: { select: { courses: true } } } satisfies Prisma.CategoryInclude;
type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof include }>;

const toDto = (row: CategoryRow, children: CategoryDto[] = []): CategoryDto => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortLabel: row.shortLabel ?? "",
    description: row.description,
    color: row.color,
    sortOrder: row.sortOrder,
    status: statusLabels[row.status],
    courseCount: row._count.courses,
    parentId: row.parentId,
    children,
});

export async function listCategoryTree(): Promise<CategoryDto[]> {
    const rows = await prisma.category.findMany({ include, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
    const children = new Map<string, CategoryDto[]>();
    for (const row of rows) {
        if (row.parentId) children.set(row.parentId, [...(children.get(row.parentId) ?? []), toDto(row)]);
    }
    return rows.filter((row) => !row.parentId).map((row) => toDto(row, children.get(row.id) ?? []));
}

const schema = z.object({
    title: z.string().trim().min(2, "Enter the category name.").max(80),
    slug: z.string().trim().max(120).refine((v) => v === "" || /^[a-z0-9][a-z0-9-]{1,119}$/.test(v), "Use lowercase letters, numbers and dashes.").default(""),
    shortLabel: z.string().trim().max(80).default(""),
    description: z.string().trim().max(1000).default(""),
    color: z.enum(categoryColors).default("teal"),
    parentId: z.string().min(1).nullable().default(null),
    status: z.string().default("Published"),
});

async function uniqueSlug(base: string) {
    const root = slugify(base) || "category";
    for (let n = 1; n < 200; n += 1) {
        const candidate = n === 1 ? root : `${root}-${n}`;
        if (!reservedSlugs.has(candidate) && !(await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
    }
    throw new BusinessRule("Could not generate a unique URL name. Enter one manually.");
}

async function assertSlugFree(slug: string, topLevel: boolean, excludeId?: string) {
    if (topLevel && reservedSlugs.has(slug)) throw new ValidationError({ slug: "This URL name is reserved by the website." });
    const taken = await prisma.category.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (taken) throw new Conflict("Another category already uses this URL name.", { slug: "Already in use." });
}

async function reload(id: string) {
    const row = await prisma.category.findUnique({ where: { id }, include });
    if (!row) throw new NotFound();
    return toDto(row);
}

export async function createCategory(input: unknown, actor: Actor) {
    const data = parseWith(schema, input);
    const status = statusFromLabel(data.status);
    if (!status) throw new ValidationError({ status: "Choose Published, Draft or Archived." });
    if (data.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { parentId: true } });
        if (!parent) throw new ValidationError({ parentId: "Choose an existing parent category." });
        if (parent.parentId) throw new ValidationError({ parentId: "Sub-categories cannot have their own sub-categories." });
    } else if (!data.description) {
        throw new ValidationError({ description: "Write a short description shown on the website." });
    }
    const titleTaken = await prisma.category.findFirst({ where: { title: data.title, parentId: data.parentId }, select: { id: true } });
    if (titleTaken) throw new Conflict("A category with this name already exists here.", { title: "Already in use." });

    const slug = data.slug || (await uniqueSlug(data.title));
    await assertSlugFree(slug, !data.parentId);
    const last = await prisma.category.findFirst({ where: { parentId: data.parentId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const row = await prisma.category.create({
        data: { slug, title: data.title, shortLabel: data.shortLabel || null, description: data.description, color: data.color, parentId: data.parentId, status, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
    await writeAudit({ actorId: actor.id, action: "category.create", entity: "Category", entityId: row.id, after: { title: row.title, slug }, ip: actor.ip });
    return reload(row.id);
}

export async function updateCategory(id: string, input: unknown, actor: Actor) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFound();
    const data = parseWith(schema, input);
    const status = statusFromLabel(data.status);
    if (!status) throw new ValidationError({ status: "Choose Published, Draft or Archived." });
    const topLevel = !existing.parentId;
    if (topLevel && !data.description) throw new ValidationError({ description: "Write a short description shown on the website." });
    const slug = data.slug || existing.slug;
    if (slug !== existing.slug) await assertSlugFree(slug, topLevel, id);
    const titleTaken = await prisma.category.findFirst({ where: { title: data.title, parentId: existing.parentId, id: { not: id } }, select: { id: true } });
    if (titleTaken) throw new Conflict("A category with this name already exists here.", { title: "Already in use." });

    await prisma.category.update({
        where: { id },
        data: { title: data.title, slug, shortLabel: data.shortLabel || null, description: data.description, color: data.color, status },
    });
    const action = existing.status !== status ? (status === "PUBLISHED" ? "category.publish" : "category.unpublish") : "category.update";
    await writeAudit({ actorId: actor.id, action, entity: "Category", entityId: id, before: { title: existing.title, status: existing.status, slug: existing.slug }, after: { title: data.title, status, slug }, ip: actor.ip });
    return reload(id);
}

const reorderSchema = z.object({ parentId: z.string().nullable(), ids: z.array(z.string()).min(1).max(500) });

export async function reorderCategories(input: unknown, actor: Actor) {
    const { parentId, ids } = parseWith(reorderSchema, input);
    const siblings = await prisma.category.findMany({ where: { parentId }, select: { id: true } });
    const known = new Set(siblings.map((s) => s.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
        throw new ValidationError({ ids: "The order must list every category in this group exactly once." });
    }
    await prisma.$transaction(ids.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } })));
    await writeAudit({ actorId: actor.id, action: "category.reorder", entity: "Category", entityId: parentId, after: { count: ids.length }, ip: actor.ip });
    return listCategoryTree();
}

export async function deleteCategory(id: string, actor: Actor) {
    const row = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { courses: true, children: true } } } });
    if (!row) throw new NotFound();
    if (row._count.children > 0) throw new BusinessRule("This category has sub-categories. Remove or archive those first.");
    if (row._count.courses > 0) throw new BusinessRule("Courses still use this category. Archive it instead of deleting it.");
    await prisma.category.delete({ where: { id } });
    await writeAudit({ actorId: actor.id, action: "category.delete", entity: "Category", entityId: id, before: { title: row.title }, ip: actor.ip });
}
