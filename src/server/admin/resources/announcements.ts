import type { AnnouncementUrgency, Prisma } from "@/generated/prisma/client";
import { ALL_LEARNERS, announcementTags } from "@/lib/admin/announcements";
import type { Row } from "@/lib/admin/types";
import { fromIst, istDayRange, toIst } from "@/lib/ist";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { statusFromLabel, statusLabels } from "./helpers";

const urgencyLabels: Record<AnnouncementUrgency, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
const urgencyFromLabel = (label: string) => (Object.keys(urgencyLabels) as AnnouncementUrgency[]).find((key) => urgencyLabels[key] === label);

const include = { batches: { select: { batch: { select: { id: true, name: true } } } } } satisfies Prisma.AnnouncementInclude;
type AnnouncementRow = Prisma.AnnouncementGetPayload<{ include: typeof include }>;

const tagsOf = (value: Prisma.JsonValue | null) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

export function toAnnouncementRow(item: AnnouncementRow): Row {
    const at = toIst(item.publishAt);
    return {
        id: item.id,
        name: item.title,
        audience: item.audience === "ALL" ? ALL_LEARNERS : item.batches.map((b) => b.batch.name).join(", "),
        urgency: urgencyLabels[item.urgency],
        tags: tagsOf(item.tags),
        date: `${at.date}T${at.time}`,
        message: item.body,
        status: statusLabels[item.status],
    };
}

const schema = z.object({
    name: z.string().trim().min(3, "Enter a title.").max(200),
    audience: z.string().min(1, "Choose who this is for."),
    urgency: z.string().min(1, "Choose the urgency."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Choose a publish date and time."),
    tags: z.array(z.string()).max(5, "Choose at most five tags.").default([]),
    message: z.string().trim().min(5, "Write the message.").max(5000),
    status: z.string().default("Published"),
});

async function resolve(input: z.output<typeof schema>) {
    const urgency = urgencyFromLabel(input.urgency);
    if (!urgency) throw new ValidationError({ urgency: "Choose High, Medium or Low." });
    const status = statusFromLabel(input.status);
    if (!status) throw new ValidationError({ status: "Choose Published, Draft or Archived." });
    const tags = [...new Set(input.tags)];
    const unknown = tags.find((tag) => !(announcementTags as readonly string[]).includes(tag));
    if (unknown) throw new ValidationError({ tags: `"${unknown}" is not one of the available tags.` });
    const publishAt = fromIst(input.date.slice(0, 10), input.date.slice(11, 16));
    if (Number.isNaN(publishAt.getTime())) throw new ValidationError({ date: "Choose a valid publish date." });

    let batchId: string | null = null;
    if (input.audience !== ALL_LEARNERS) {
        const batch = await prisma.batch.findUnique({ where: { name: input.audience } });
        if (!batch || batch.status === "ARCHIVED") throw new ValidationError({ audience: "Choose All learners or an existing batch." });
        batchId = batch.id;
    }
    return { urgency, status, tags, publishAt, batchId };
}

function listWhere(query: ListQuery): Prisma.AnnouncementWhereInput {
    const and: Prisma.AnnouncementWhereInput[] = [];
    if (query.q) and.push({ title: { contains: query.q } });
    if (query.filters.tags) and.push({ tags: { path: "$", array_contains: query.filters.tags } });
    if (query.from) and.push({ publishAt: { gte: istDayRange(query.from).start } });
    if (query.to) and.push({ publishAt: { lt: istDayRange(query.to).end } });
    return { AND: and };
}

async function list(query: ListQuery): Promise<ListResult> {
    const where = listWhere(query);
    const dir = query.sort?.dir ?? "desc";
    const [rows, total] = await Promise.all([
        prisma.announcement.findMany({ where, include, orderBy: query.sort?.key === "name" ? { title: dir } : { publishAt: dir }, skip: query.skip, take: query.take }),
        prisma.announcement.count({ where }),
    ]);
    return { rows: rows.map(toAnnouncementRow), total };
}

async function load(id: string) {
    const item = await prisma.announcement.findUnique({ where: { id }, include });
    if (!item) throw new NotFound();
    return item;
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const resolved = await resolve(data);
    const created = await prisma.announcement.create({
        data: {
            title: data.name,
            body: data.message,
            urgency: resolved.urgency,
            tags: resolved.tags,
            audience: resolved.batchId ? "BATCH" : "ALL",
            publishAt: resolved.publishAt,
            status: resolved.status,
            createdById: ctx.user.id,
            batches: resolved.batchId ? { create: [{ batchId: resolved.batchId }] } : undefined,
        },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "announcement.create", entity: "Announcement", entityId: created.id, after: { title: data.name, audience: data.audience, status: resolved.status }, ip: ctx.ip });
    return toAnnouncementRow(created);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const data = parseWith(schema, input);
    const resolved = await resolve(data);
    await prisma.$transaction([
        prisma.announcementBatch.deleteMany({ where: { announcementId: id } }),
        prisma.announcement.update({
            where: { id },
            data: {
                title: data.name,
                body: data.message,
                urgency: resolved.urgency,
                tags: resolved.tags,
                audience: resolved.batchId ? "BATCH" : "ALL",
                publishAt: resolved.publishAt,
                status: resolved.status,
                batches: resolved.batchId ? { create: [{ batchId: resolved.batchId }] } : undefined,
            },
        }),
    ]);
    const action = existing.status !== resolved.status ? (resolved.status === "PUBLISHED" ? "announcement.publish" : resolved.status === "ARCHIVED" ? "announcement.archive" : "announcement.unpublish") : "announcement.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Announcement", entityId: id, before: { title: existing.title, status: existing.status }, after: { title: data.name, status: resolved.status }, ip: ctx.ip });
    return toAnnouncementRow(await load(id));
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const updated = await prisma.announcement.update({ where: { id }, data: { status: "ARCHIVED" }, include });
    await writeAudit({ actorId: ctx.user.id, action: "announcement.archive", entity: "Announcement", entityId: id, before: { status: existing.status }, ip: ctx.ip });
    return toAnnouncementRow(updated);
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const copy = await prisma.announcement.create({
        data: {
            title: `${source.title} (copy)`,
            body: source.body,
            urgency: source.urgency,
            tags: tagsOf(source.tags),
            audience: source.audience,
            publishAt: new Date(),
            status: "DRAFT",
            createdById: ctx.user.id,
            batches: { create: source.batches.map((b) => ({ batchId: b.batch.id })) },
        },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "announcement.create", entity: "Announcement", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return toAnnouncementRow(copy);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    if (existing.status !== "DRAFT") throw new BusinessRule("Only drafts can be deleted. Archive a published announcement instead.");
    await prisma.announcement.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "announcement.delete", entity: "Announcement", entityId: id, before: { title: existing.title }, ip: ctx.ip });
}

async function options(): Promise<Record<string, string[]>> {
    const batches = await prisma.batch.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { name: true } });
    return { audience: [ALL_LEARNERS, ...batches.map((b) => b.name)] };
}

export const announcementResource: ResourceDef = {
    key: "learning/announcements",
    resource: "announcements",
    sortableKeys: ["name", "date"],
    list,
    get: async (id) => toAnnouncementRow(await load(id)),
    options,
    create,
    update,
    remove,
    actions: { archive, duplicate },
};
