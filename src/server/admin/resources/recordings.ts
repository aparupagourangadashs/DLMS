import type { BatchStatus, Prisma, RecordingStatus } from "@/generated/prisma/client";
import { sessionLabel } from "@/lib/admin/recordings";
import type { Row } from "@/lib/admin/types";
import { istDayRange, toIst } from "@/lib/ist";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { labelMap, staffOptions } from "@/server/services/lookups";
import { z } from "zod";
import { batchStatusLabels } from "./batches";
import { httpsUrl } from "./helpers";

const include = {
    session: { select: { id: true, title: true, startsAt: true, instructorId: true, batch: { select: { name: true, status: true, instructorId: true } } } },
} satisfies Prisma.RecordingInclude;
type RecordingRow = Prisma.RecordingGetPayload<{ include: typeof include }>;

const statusLabels: Record<RecordingStatus, string> = { AVAILABLE: "Available", PROCESSING: "Processing", FAILED: "Failed" };
const statusFromLabel = (label: string) => (Object.keys(statusLabels) as RecordingStatus[]).find((key) => statusLabels[key] === label);
const batchStatusFromLabel = (label: string) => (Object.keys(batchStatusLabels) as BatchStatus[]).find((key) => batchStatusLabels[key] === label);

const MAX_PER_SESSION = 10;

// Branch-scoped staff reach the classes of their own branches' batches and of batches that belong to no branch.
const isScoped = (ctx: ResourceContext) => ctx.user.role !== "SUPER_ADMIN" && ctx.user.branchIds.length > 0;
const batchScope = (ctx: ResourceContext): Prisma.BatchWhereInput => (isScoped(ctx) ? { OR: [{ branchId: { in: ctx.user.branchIds } }, { branchId: null }] } : {});
const sessionScope = (ctx: ResourceContext): Prisma.SessionWhereInput => ({ batch: batchScope(ctx) });

const labelOf = (session: { title: string; startsAt: Date; batch: { name: string } }) => sessionLabel({ ...toIst(session.startsAt), batch: session.batch.name, title: session.title });

function toRow(recording: RecordingRow, staff: Map<string, string>): Row {
    const teacher = recording.session.instructorId ?? recording.session.batch.instructorId;
    return {
        id: recording.id,
        name: recording.title || recording.session.title,
        date: toIst(recording.session.startsAt).date,
        batch: recording.session.batch.name,
        instructor: teacher ? staff.get(teacher) ?? "" : "",
        url: recording.url,
        title: recording.title ?? "",
        session: labelOf(recording.session),
        status: statusLabels[recording.status],
        batchStatus: batchStatusLabels[recording.session.batch.status],
    };
}

const schema = z.object({
    session: z.string().min(1, "Choose the class."),
    title: z.string().trim().max(300).default(""),
    url: httpsUrl,
    status: z.string().default("Available"),
});

/** Classes that have started, newest first, named as the form shows them. A label shared by two classes gets a number. */
async function sessionChoices(ctx: ResourceContext) {
    const rows = await prisma.session.findMany({
        where: { AND: [sessionScope(ctx), { status: { not: "CANCELLED" }, startsAt: { lte: new Date() }, batch: { status: { not: "ARCHIVED" } } }] },
        orderBy: { startsAt: "desc" },
        take: 300,
        select: { id: true, title: true, startsAt: true, batch: { select: { name: true } } },
    });
    const seen = new Map<string, number>();
    return rows.map((row) => {
        const base = labelOf(row);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return { id: row.id, label: n === 1 ? base : `${base} (${n})` };
    });
}

async function resolveSession(label: string, ctx: ResourceContext, current?: RecordingRow) {
    if (current && label === labelOf(current.session)) return current.session.id;
    const found = (await sessionChoices(ctx)).find((choice) => choice.label === label);
    if (!found) throw new ValidationError({ session: "Choose a class from the list." });
    return found.id;
}

function listWhere(query: ListQuery, ctx: ResourceContext): Prisma.RecordingWhereInput[] {
    const and: Prisma.RecordingWhereInput[] = [{ session: sessionScope(ctx) }];
    if (query.q) and.push({ OR: [{ title: { contains: query.q } }, { session: { OR: [{ title: { contains: query.q } }, { batch: { name: { contains: query.q } } }] } }] });
    if (query.filters.batch) and.push({ session: { batch: { name: query.filters.batch } } });
    if (query.from) and.push({ session: { startsAt: { gte: istDayRange(query.from).start } } });
    if (query.to) and.push({ session: { startsAt: { lt: istDayRange(query.to).end } } });
    return and;
}

async function list(query: ListQuery, ctx: ResourceContext): Promise<ListResult> {
    const base = listWhere(query, ctx);
    const batchStatus = query.tab ? batchStatusFromLabel(query.tab) : undefined;
    const where: Prisma.RecordingWhereInput = { AND: [...base, ...(batchStatus ? [{ session: { batch: { status: batchStatus } } }] : [])] };
    const dir = query.sort?.dir ?? "desc";
    const [rows, total, counts, staff] = await Promise.all([
        prisma.recording.findMany({ where, include, orderBy: query.sort?.key === "name" ? { session: { title: dir } } : { session: { startsAt: dir } }, skip: query.skip, take: query.take }),
        prisma.recording.count({ where }),
        Promise.all((Object.keys(batchStatusLabels) as BatchStatus[]).map(async (status) => [batchStatusLabels[status], await prisma.recording.count({ where: { AND: [...base, { session: { batch: { status } } }] } })] as const)),
        staffOptions(),
    ]);
    const names = labelMap(staff);
    return { rows: rows.map((r) => toRow(r, names)), total, tabCounts: Object.fromEntries(counts) };
}

async function load(id: string, ctx: ResourceContext) {
    const recording = await prisma.recording.findFirst({ where: { id, session: sessionScope(ctx) }, include });
    if (!recording) throw new NotFound();
    return recording;
}

async function row(id: string, ctx: ResourceContext): Promise<Row> {
    return toRow(await load(id, ctx), labelMap(await staffOptions()));
}

function resolveStatus(label: string) {
    const status = statusFromLabel(label);
    if (!status) throw new ValidationError({ status: "Choose Available, Processing or Failed." });
    return status;
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const status = resolveStatus(data.status);
    const sessionId = await resolveSession(data.session, ctx);
    if ((await prisma.recording.count({ where: { sessionId } })) >= MAX_PER_SESSION) throw new BusinessRule(`A class can have at most ${MAX_PER_SESSION} recordings.`);
    const created = await prisma.recording.create({ data: { sessionId, title: data.title || null, url: data.url, status, createdById: ctx.user.id } });
    await writeAudit({ actorId: ctx.user.id, action: "recording.create", entity: "Recording", entityId: created.id, after: { session: sessionId, status }, ip: ctx.ip });
    return row(created.id, ctx);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id, ctx);
    const data = parseWith(schema, input);
    const status = resolveStatus(data.status);
    const sessionId = await resolveSession(data.session, ctx, existing);
    if (sessionId !== existing.sessionId && (await prisma.recording.count({ where: { sessionId } })) >= MAX_PER_SESSION) throw new BusinessRule(`A class can have at most ${MAX_PER_SESSION} recordings.`);
    await prisma.recording.update({ where: { id }, data: { sessionId, title: data.title || null, url: data.url, status } });
    const action = existing.status !== status ? (status === "AVAILABLE" ? "recording.publish" : "recording.unpublish") : "recording.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Recording", entityId: id, before: { session: existing.sessionId, status: existing.status }, after: { session: sessionId, status }, ip: ctx.ip });
    return row(id, ctx);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id, ctx);
    await prisma.recording.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "recording.delete", entity: "Recording", entityId: id, before: { session: existing.sessionId, status: existing.status }, ip: ctx.ip });
}

async function options(ctx?: ResourceContext): Promise<Record<string, string[]>> {
    if (!ctx) return {};
    const [choices, batches] = await Promise.all([sessionChoices(ctx), prisma.batch.findMany({ where: batchScope(ctx), orderBy: { name: "asc" }, select: { name: true } })]);
    return { session: choices.map((c) => c.label), batch: batches.map((b) => b.name) };
}

export const recordingResource: ResourceDef = {
    key: "learning/session-recordings",
    resource: "recordings",
    sortableKeys: ["name", "date"],
    list,
    get: (id, ctx) => row(id, ctx),
    options,
    create,
    update,
    remove,
};
