import type { BatchStatus, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { Conflict, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { courseOptions, idByLabel, labelMap, staffOptions, type Option } from "@/server/services/lookups";
import { z } from "zod";
import { dateOnly, isoDay } from "./helpers";

const include = {
    course: { select: { id: true, title: true } },
    branch: { select: { id: true, name: true } },
    extraManagers: { select: { userId: true } },
} satisfies Prisma.BatchInclude;
type BatchRow = Prisma.BatchGetPayload<{ include: typeof include }>;

export const batchStatusLabels: Record<BatchStatus, string> = { ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };
const statusFromLabel = (label: string) => (Object.keys(batchStatusLabels) as BatchStatus[]).find((key) => batchStatusLabels[key] === label);

const requiredDate = (message: string) => dateOnly.refine((value) => value !== null, message);

const schema = z
    .object({
        name: z.string().trim().min(3, "Enter the batch name.").max(200),
        course: z.string().min(1, "Choose a course."),
        startDate: requiredDate("Choose the start date."),
        endDate: requiredDate("Choose the end date."),
        instructor: z.string().min(1, "Choose the instructor."),
        manager: z.string().min(1, "Choose the primary manager."),
        additionalManagers: z.array(z.string()).max(20).default([]),
        branch: z.string().trim().default(""),
        status: z.string().default("Active"),
    })
    .refine((value) => !value.startDate || !value.endDate || value.endDate > value.startDate, { path: ["endDate"], message: "The end date must be after the start date." });

type Input = z.output<typeof schema>;

// Branch-scoped staff see their own branches' batches and the batches that belong to no branch; they edit only their own.
const isScoped = (ctx: ResourceContext) => ctx.user.role !== "SUPER_ADMIN" && ctx.user.branchIds.length > 0;
const scope = (ctx: ResourceContext): Prisma.BatchWhereInput => (isScoped(ctx) ? { OR: [{ branchId: { in: ctx.user.branchIds } }, { branchId: null }] } : {});
const assertMayEdit = (batch: { branchId: string | null }, ctx: ResourceContext) => {
    if (isScoped(ctx) && (!batch.branchId || !ctx.user.branchIds.includes(batch.branchId))) throw new Forbidden("You can only change batches of your own branch.");
};

async function lookups() {
    const [staff, courses] = await Promise.all([staffOptions(), courseOptions()]);
    return { staff, courses, staffLabel: labelMap(staff), courseLabel: labelMap(courses) };
}
type Lookups = Awaited<ReturnType<typeof lookups>>;

type Stats = Map<string, { learners: number; progress: number }>;

async function statsFor(batchIds: string[]): Promise<Stats> {
    if (batchIds.length === 0) return new Map();
    const grouped = await prisma.enrolment.groupBy({
        by: ["batchId"],
        where: { batchId: { in: batchIds }, status: { in: ["ACTIVE", "COMPLETED"] } },
        _count: { _all: true },
        _avg: { progressPercent: true },
    });
    return new Map(grouped.flatMap((g) => (g.batchId ? [[g.batchId, { learners: g._count._all, progress: Math.round(g._avg.progressPercent ?? 0) }] as const] : [])));
}

export function toBatchRow(batch: BatchRow, look: Lookups, stats?: { learners: number; progress: number }): Row {
    const label = (id: string | null) => (id ? look.staffLabel.get(id) ?? "" : "");
    return {
        id: batch.id,
        name: batch.name,
        course: look.courseLabel.get(batch.courseId) ?? batch.course.title,
        duration: `${formatDate(isoDay(batch.startDate))} – ${formatDate(isoDay(batch.endDate))}`,
        startDate: isoDay(batch.startDate),
        endDate: isoDay(batch.endDate),
        instructor: label(batch.instructorId),
        manager: label(batch.managerId),
        additionalManagers: batch.extraManagers.map((m) => label(m.userId)).filter(Boolean),
        branch: batch.branch?.name ?? "",
        learners: stats?.learners ?? 0,
        progress: stats?.progress ?? 0,
        status: batchStatusLabels[batch.status],
    };
}

function listWhere(query: ListQuery, ctx: ResourceContext, look: Lookups): Prisma.BatchWhereInput {
    const and: Prisma.BatchWhereInput[] = [scope(ctx)];
    if (query.q) and.push({ OR: [{ name: { contains: query.q } }, { course: { title: { contains: query.q } } }] });
    if (query.filters.course) and.push({ courseId: idByLabel(look.courses, query.filters.course) ?? "none" });
    if (query.filters.instructor) and.push({ instructorId: idByLabel(look.staff, query.filters.instructor) ?? "none" });
    return { AND: and };
}

function orderBy(query: ListQuery): Prisma.BatchOrderByWithRelationInput[] {
    const dir = query.sort?.dir ?? "asc";
    if (query.sort?.key === "name") return [{ name: dir }];
    if (query.sort?.key === "course") return [{ course: { title: dir } }];
    return [{ startDate: "desc" }, { name: "asc" }];
}

async function list(query: ListQuery, ctx: ResourceContext): Promise<ListResult> {
    const look = await lookups();
    const base = listWhere(query, ctx, look);
    const status = query.tab ? statusFromLabel(query.tab) : undefined;
    const where: Prisma.BatchWhereInput = status ? { AND: [base, { status }] } : base;
    const [rows, total, grouped] = await Promise.all([
        prisma.batch.findMany({ where, include, orderBy: orderBy(query), skip: query.skip, take: query.take }),
        prisma.batch.count({ where }),
        prisma.batch.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    ]);
    const stats = await statsFor(rows.map((r) => r.id));
    const tabCounts: Record<string, number> = { Active: 0, Completed: 0, Archived: 0 };
    for (const row of grouped) tabCounts[batchStatusLabels[row.status]] = row._count._all;
    return { rows: rows.map((r) => toBatchRow(r, look, stats.get(r.id))), total, tabCounts };
}

async function load(id: string, ctx: ResourceContext) {
    const batch = await prisma.batch.findFirst({ where: { id, ...scope(ctx) }, include });
    if (!batch) throw new NotFound();
    return batch;
}

async function resolve(input: Input, look: Lookups, ctx: ResourceContext) {
    const courseId = idByLabel(look.courses, input.course);
    if (!courseId) throw new ValidationError({ course: "Choose an existing course." });
    const teachers = await staffOptions(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]);
    const instructorId = idByLabel(teachers, input.instructor);
    if (!instructorId) throw new ValidationError({ instructor: "Choose an instructor from the list." });
    const managerId = idByLabel(look.staff, input.manager);
    if (!managerId) throw new ValidationError({ manager: "Choose a manager from the list." });
    const extra: string[] = [];
    for (const label of input.additionalManagers) {
        const id = idByLabel(look.staff, label);
        if (!id) throw new ValidationError({ additionalManagers: `${label} is not an active staff member.` });
        if (id !== managerId && !extra.includes(id)) extra.push(id);
    }
    const status = statusFromLabel(input.status);
    if (!status) throw new ValidationError({ status: "Choose Active, Completed or Archived." });

    let branchId: string | null = null;
    if (input.branch) {
        const branch = await prisma.branch.findUnique({ where: { name: input.branch } });
        if (!branch) throw new ValidationError({ branch: "Choose an existing branch." });
        if (isScoped(ctx) && !ctx.user.branchIds.includes(branch.id)) throw new Forbidden("You can only use your own branch.");
        branchId = branch.id;
    } else if (isScoped(ctx)) {
        branchId = ctx.user.branchIds[0];
    }
    return { courseId, instructorId, managerId, extra, status, branchId };
}

async function assertNameFree(name: string, excludeId?: string) {
    const taken = await prisma.batch.findFirst({ where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (taken) throw new Conflict("Another batch already has this name.", { name: "Already in use." });
}

const replaceManagers = (batchId: string, userIds: string[]) => [
    prisma.batchManager.deleteMany({ where: { batchId } }),
    prisma.batchManager.createMany({ data: userIds.map((userId) => ({ batchId, userId })) }),
];

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const look = await lookups();
    const ids = await resolve(data, look, ctx);
    await assertNameFree(data.name);
    const batch = await prisma.batch.create({
        data: {
            name: data.name,
            courseId: ids.courseId,
            startDate: data.startDate!,
            endDate: data.endDate!,
            instructorId: ids.instructorId,
            managerId: ids.managerId,
            branchId: ids.branchId,
            status: ids.status,
            extraManagers: { create: ids.extra.map((userId) => ({ userId })) },
        },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "batch.create", entity: "Batch", entityId: batch.id, after: { name: batch.name, course: data.course, status: ids.status }, ip: ctx.ip });
    return toBatchRow(batch, look);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id, ctx);
    assertMayEdit(existing, ctx);
    const data = parseWith(schema, input);
    const look = await lookups();
    const ids = await resolve(data, look, ctx);
    await assertNameFree(data.name, id);
    await prisma.$transaction([
        prisma.batch.update({
            where: { id },
            data: {
                name: data.name,
                courseId: ids.courseId,
                startDate: data.startDate!,
                endDate: data.endDate!,
                instructorId: ids.instructorId,
                managerId: ids.managerId,
                branchId: ids.branchId,
                status: ids.status,
            },
        }),
        ...replaceManagers(id, ids.extra),
    ]);
    const action = existing.status !== ids.status ? (ids.status === "COMPLETED" ? "batch.complete" : ids.status === "ARCHIVED" ? "batch.archive" : "batch.reopen") : "batch.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Batch", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: data.name, status: ids.status }, ip: ctx.ip });
    const stats = await statsFor([id]);
    return toBatchRow(await load(id, ctx), look, stats.get(id));
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id, ctx);
    assertMayEdit(existing, ctx);
    const updated = await prisma.batch.update({ where: { id }, data: { status: "ARCHIVED" }, include });
    await writeAudit({ actorId: ctx.user.id, action: "batch.archive", entity: "Batch", entityId: id, before: { status: existing.status }, ip: ctx.ip });
    const stats = await statsFor([id]);
    return toBatchRow(updated, await lookups(), stats.get(id));
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id, ctx);
    let name = `${source.name} (copy)`;
    for (let n = 2; await prisma.batch.findUnique({ where: { name }, select: { id: true } }); n += 1) name = `${source.name} (copy ${n})`;
    const copy = await prisma.batch.create({
        data: {
            name,
            courseId: source.courseId,
            startDate: source.startDate,
            endDate: source.endDate,
            instructorId: source.instructorId,
            managerId: source.managerId,
            branchId: source.branchId,
            status: "ACTIVE",
            extraManagers: { create: source.extraManagers.map((m) => ({ userId: m.userId })) },
        },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "batch.create", entity: "Batch", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return toBatchRow(copy, await lookups());
}

async function options(): Promise<Record<string, string[]>> {
    const [look, teachers, branches] = await Promise.all([lookups(), staffOptions(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]), prisma.branch.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { name: true } })]);
    const staff = look.staff.map((s: Option) => s.label);
    return { course: look.courses.map((c) => c.label), instructor: teachers.map((t) => t.label), manager: staff, additionalManagers: staff, branch: branches.map((b) => b.name) };
}

export const batchResource: ResourceDef = {
    key: "learning/batches",
    resource: "batches",
    sortableKeys: ["name", "course"],
    list,
    get: async (id, ctx) => {
        const batch = await load(id, ctx);
        const stats = await statsFor([id]);
        return toBatchRow(batch, await lookups(), stats.get(id));
    },
    options,
    create,
    update,
    actions: { archive, duplicate },
};
