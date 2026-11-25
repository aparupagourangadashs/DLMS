import type { ContentType, ModuleContent, Prisma } from "@/generated/prisma/client";
import { contentLabel, usedInLabel } from "@/lib/admin/modules";
import type { Row } from "@/lib/admin/types";
import { youtubeId } from "@/lib/video";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { isoDay, optionalInt, parseRepeat, statusFromLabel, statusLabels } from "./helpers";

const typeByLabel = { Text: "TEXT", Video: "VIDEO", Link: "LINK" } as const satisfies Record<string, ContentType>;
const labelByType: Record<ContentType, string> = { TEXT: "Text", VIDEO: "Video", LINK: "Link" };

const lessonSchema = z
    .object({
        id: z.string().default(""),
        title: z.string().trim().min(1, "Enter the lesson title.").max(300),
        type: z.enum(["Text", "Video", "Link"], { error: "Choose Text, Video or Link." }),
        minutes: optionalInt(1, 600).default(null),
        content: z.string().max(20_000, "Keep the lesson text under 20,000 characters.").default(""),
        url: z.string().trim().max(500).default(""),
    })
    .superRefine((lesson, ctx) => {
        if (lesson.type === "Text" && !lesson.content.trim()) ctx.addIssue({ code: "custom", path: ["content"], message: "Write the lesson text." });
        if (lesson.type === "Video" && !youtubeId(lesson.url)) ctx.addIssue({ code: "custom", path: ["url"], message: "Use a YouTube address such as https://www.youtube.com/watch?v=… (choose Link for other sites)." });
        if (lesson.type === "Link" && !/^https:\/\/[^\s]+$/.test(lesson.url)) ctx.addIssue({ code: "custom", path: ["url"], message: "Enter a full https:// address." });
    });
type LessonInput = z.output<typeof lessonSchema>;

const schema = z.object({
    name: z.string().trim().min(2, "Enter the module name.").max(200),
    description: z.string().trim().max(2000).default(""),
    status: z.string().default("Published"),
    lessons: z.unknown().default(""),
});

const include = { _count: { select: { courses: true } } } satisfies Prisma.ModuleInclude;
type ModuleRow = Prisma.ModuleGetPayload<{ include: typeof include }>;

type Summary = { total: number; videos: number; links: number };

export function toModuleRow(record: ModuleRow, summary: Summary, lessons?: ModuleContent[]): Row {
    return {
        id: record.id,
        name: record.name,
        description: record.description ?? "",
        status: statusLabels[record.status],
        content: contentLabel(summary),
        usedIn: usedInLabel(record._count.courses),
        updatedOn: isoDay(record.updatedAt),
        ...(lessons
            ? { lessons: JSON.stringify(lessons.map((l) => ({ id: l.id, title: l.title, type: labelByType[l.type], minutes: l.minutes === null ? "" : String(l.minutes), content: l.body ?? "", url: l.url ?? "" }))) }
            : {}),
    };
}

async function summaries(moduleIds: string[]): Promise<Map<string, Summary>> {
    const result = new Map<string, Summary>(moduleIds.map((id) => [id, { total: 0, videos: 0, links: 0 }]));
    if (moduleIds.length === 0) return result;
    const grouped = await prisma.moduleContent.groupBy({ by: ["moduleId", "type"], where: { moduleId: { in: moduleIds } }, _count: { _all: true } });
    for (const g of grouped) {
        const entry = result.get(g.moduleId);
        if (!entry) continue;
        entry.total += g._count._all;
        if (g.type === "VIDEO") entry.videos += g._count._all;
        if (g.type === "LINK") entry.links += g._count._all;
    }
    return result;
}

function listWhere(query: ListQuery): Prisma.ModuleWhereInput {
    return query.q ? { OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }] } : {};
}

async function list(query: ListQuery): Promise<ListResult> {
    const base = listWhere(query);
    const status = query.tab ? statusFromLabel(query.tab) : undefined;
    const where: Prisma.ModuleWhereInput = status ? { AND: [base, { status }] } : base;
    const dir = query.sort?.dir ?? "asc";
    const [rows, total, grouped] = await Promise.all([
        prisma.module.findMany({ where, include, orderBy: query.sort?.key === "updatedOn" ? { updatedAt: dir } : { name: dir }, skip: query.skip, take: query.take }),
        prisma.module.count({ where }),
        prisma.module.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    ]);
    const counts = await summaries(rows.map((r) => r.id));
    const tabCounts: Record<string, number> = { Published: 0, Draft: 0, Archived: 0 };
    for (const row of grouped) tabCounts[statusLabels[row.status]] = row._count._all;
    return { rows: rows.map((r) => toModuleRow(r, counts.get(r.id)!)), total, tabCounts };
}

async function load(id: string) {
    const record = await prisma.module.findUnique({ where: { id }, include });
    if (!record) throw new NotFound();
    return record;
}

async function full(id: string): Promise<Row> {
    const [record, lessons] = await Promise.all([load(id), prisma.moduleContent.findMany({ where: { moduleId: id }, orderBy: { sortOrder: "asc" } })]);
    return toModuleRow(record, { total: lessons.length, videos: lessons.filter((l) => l.type === "VIDEO").length, links: lessons.filter((l) => l.type === "LINK").length }, lessons);
}

async function assertNameFree(name: string, excludeId?: string) {
    const taken = await prisma.module.findFirst({ where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (taken) throw new Conflict("Another module already has this name.", { name: "Already in use." });
}

function resolve(input: z.output<typeof schema>) {
    const status = statusFromLabel(input.status);
    if (!status) throw new ValidationError({ status: "Choose Published, Draft or Archived." });
    return { status, lessons: parseRepeat(input.lessons, lessonSchema, 100, "lessons") };
}

const lessonData = (lesson: LessonInput, sortOrder: number) => {
    const type = typeByLabel[lesson.type];
    return { type, title: lesson.title, minutes: lesson.minutes, body: type === "TEXT" ? lesson.content : null, url: type === "TEXT" ? null : lesson.url, sortOrder };
};

/** Lessons keep their id when they are edited, so learners' progress survives; lessons left out of the list are removed. */
async function saveLessons(tx: Prisma.TransactionClient, moduleId: string, lessons: LessonInput[]) {
    const existing = new Set((await tx.moduleContent.findMany({ where: { moduleId }, select: { id: true } })).map((l) => l.id));
    const kept = new Set<string>();
    for (const [index, lesson] of lessons.entries()) {
        if (lesson.id && existing.has(lesson.id) && !kept.has(lesson.id)) {
            await tx.moduleContent.update({ where: { id: lesson.id }, data: lessonData(lesson, index) });
            kept.add(lesson.id);
        } else await tx.moduleContent.create({ data: { moduleId, ...lessonData(lesson, index) } });
    }
    const dropped = [...existing].filter((id) => !kept.has(id));
    if (dropped.length) await tx.moduleContent.deleteMany({ where: { id: { in: dropped } } });
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const { status, lessons } = resolve(data);
    await assertNameFree(data.name);
    const id = await prisma.$transaction(async (tx) => {
        const created = await tx.module.create({ data: { name: data.name, description: data.description || null, status } });
        await saveLessons(tx, created.id, lessons);
        return created.id;
    });
    await writeAudit({ actorId: ctx.user.id, action: "module.create", entity: "Module", entityId: id, after: { name: data.name, status, lessons: lessons.length }, ip: ctx.ip });
    return full(id);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const data = parseWith(schema, input);
    const { status, lessons } = resolve(data);
    await assertNameFree(data.name, id);
    await prisma.$transaction(async (tx) => {
        await tx.module.update({ where: { id }, data: { name: data.name, description: data.description || null, status } });
        await saveLessons(tx, id, lessons);
    });
    const action = existing.status !== status ? (status === "PUBLISHED" ? "module.publish" : status === "ARCHIVED" ? "module.archive" : "module.unpublish") : "module.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Module", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: data.name, status, lessons: lessons.length }, ip: ctx.ip });
    return full(id);
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    await prisma.module.update({ where: { id }, data: { status: "ARCHIVED" } });
    await writeAudit({ actorId: ctx.user.id, action: "module.archive", entity: "Module", entityId: id, before: { status: existing.status }, ip: ctx.ip });
    return full(id);
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const lessons = await prisma.moduleContent.findMany({ where: { moduleId: id }, orderBy: { sortOrder: "asc" } });
    let name = `${source.name} (copy)`;
    for (let n = 2; await prisma.module.findUnique({ where: { name }, select: { id: true } }); n += 1) name = `${source.name} (copy ${n})`;
    const copy = await prisma.module.create({
        data: {
            name,
            description: source.description,
            status: "DRAFT",
            contents: { create: lessons.map((l) => ({ type: l.type, title: l.title, minutes: l.minutes, body: l.body, url: l.url, sortOrder: l.sortOrder })) },
        },
    });
    await writeAudit({ actorId: ctx.user.id, action: "module.create", entity: "Module", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return full(copy.id);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    const used = existing._count.courses;
    if (used > 0) throw new Conflict(`This module is used by ${used} ${used === 1 ? "course" : "courses"}. Remove it from them first, or archive it.`);
    await prisma.module.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "module.delete", entity: "Module", entityId: id, before: { name: existing.name }, ip: ctx.ip });
}

export const moduleResource: ResourceDef = {
    key: "learning/module-library",
    resource: "modules",
    sortableKeys: ["name", "updatedOn"],
    list,
    get: (id) => full(id),
    create,
    update,
    remove,
    actions: { archive, duplicate },
};
